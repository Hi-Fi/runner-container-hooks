import * as core from '@actions/core'
import { RunContainerStepArgs } from 'hooklib'
import { createJob, CreateJobResponse, pruneTask, removeTemporaryJob, waitJobToStop } from 'src/cloudrun'
import {
  containerVolumes,
  fixArgs
} from '../cloudrun/utils'
import { JOB_CONTAINER_NAME } from './constants'
import { type google } from '@google-cloud/run/build/protos/protos'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

export async function runContainerStep(
  stepContainer: RunContainerStepArgs
): Promise<number> {

  core.debug(`stepcontainer information: ${JSON.stringify(stepContainer)}`)
  if (stepContainer.dockerfile) {
    throw new Error('Building container actions is not currently supported')
  }

  const container = createContainerDefinition(stepContainer)

  let createdTask: CreateJobResponse | undefined = undefined

  createContainerStartupScript()
  try {
    createdTask = await createJob(
      container,
      undefined,
    )
  } catch (err) {
    core.debug(`createTask failed: ${JSON.stringify(err)}`)
    const message = (err as any)?.response?.body?.message || err
    await pruneTask();
    throw new Error(`failed to create job task: ${message}`)
  }

  if (!createdTask.job.name) {
    throw new Error('created job should have name')
  }

  if (!createdTask?.runOperation?.name) {
    throw new Error('created run operation should have name')
  }

  core.debug(`Waiting for job run operation to complete using operation ${createdTask.runOperation.name}`)
  const [execution] = await createdTask.runOperation.promise()
  core.info(`Job ${createdTask.job.name} ended at ${execution.completionTime?.seconds}. Succeeded count was ${execution.succeededCount} and failed ${execution.failedCount}`);

  const githubOutput = execution.template?.containers?.[0].env?.find(env => env.name == "GITHUB_OUTPUT")?.value

  if (githubOutput) {
    core.debug(`GITHUB_OUTPUT is at ${githubOutput}`)

    const outputFile = githubOutput.split('/').pop();

    if (process.env.RUNNER_TEMP && outputFile) {
      const outputPath = join(process.env.RUNNER_TEMP, '_runner_file_commands', outputFile);
      core.debug(`Waiting for content to file ${outputPath}`)
      await new Promise<void>(resolve => {
        setInterval(() => {
          const output = readFileSync(outputPath, { encoding: 'utf8' });
          if (output.includes('greeting')) {
            core.debug(`task output: ${output}`);
            resolve()
          }
        }, 10000)
      });
    }
  }

  core.debug(`Log uri of execution: ${execution.logUri}`)

  await removeTemporaryJob(createdTask.job.name);

  return execution.succeededCount && execution.succeededCount > 0 ? 0 : 1
}

function createContainerStartupScript() {
  const content = `#!/bin/sh

ln -s /__w/_temp/_runner_file_commands /github/file_commands 
ln -s /__w/_temp/_github_workflow /github/workflow 

/usr/src/entrypoint.sh
`
  writeFileSync(join(process.env.RUNNER_TEMP!, 'start_container_step.sh'), content, { encoding: 'utf8' });
}

function createContainerDefinition(
  container: RunContainerStepArgs,
): google.cloud.run.v2.IContainer {
  const volumeMounts = containerVolumes(undefined, false, true);
  // TODO: Parametrize cache
  const image = container.image.replace('ghcr.io', 'europe-north1-docker.pkg.dev/gha-runner-example/gha-runner-test')

  // TODO: example to work with actions/container-prebuilt-action (https://github.com/actions/container-prebuilt-action/blob/main/Dockerfile#L11C14-L11C36)
  const pocEntrypoint = ['/bin/sh']
  const pocCommand = [
    '/__w/_temp/start_container_step.sh'
  ]

  return {
    name: JOB_CONTAINER_NAME,
    image,
    command: pocEntrypoint,
    args: pocCommand,
    // command: container.entryPoint
    //   ? [container.entryPoint]
    //   : undefined,
    // args: container.entryPointArgs?.length
    //   ? fixArgs(container.entryPointArgs)
    //   : undefined,
    env: [
      ...Object.entries(container.environmentVariables).map(entry => {
        return {
          name: entry[0],
          value: entry[1] as string
        }
      }),
    ],
    resources: {
      limits: {
        // Job uses always on CPU, so minumum limit is 1.
        cpu: '1',
        // TODO: Check is 512 Mb memory would be enough, as it is allowed
        memory: '1Gi'
      }
    },
    volumeMounts
  }
}
