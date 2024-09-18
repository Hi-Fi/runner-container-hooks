import * as core from '@actions/core'
import { RunContainerStepArgs } from 'hooklib'
import { createJob, CreateJobResponse, pruneTask, removeTemporaryJob, waitJobToStop } from 'src/aca'
import {
  containerVolumes,
  fixArgs} from '../aca/utils'
import { JOB_CONTAINER_NAME } from './constants'
import { Container } from '@azure/arm-appcontainers'

export async function runContainerStep(
  stepContainer: RunContainerStepArgs
): Promise<number> {
  if (stepContainer.dockerfile) {
    throw new Error('Building container actions is not currently supported')
  }

  const container = createContainerDefinition(stepContainer)

  let createdTask: CreateJobResponse | undefined = undefined

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

  if (!createdTask?.execution.name) {
    throw new Error('created task should have name')
  }

  core.debug(
    `Job execution created, waiting for it to complete ${createdTask.execution.name}`
  )

  const succeeded = await waitJobToStop(process.env.RG_NAME!, createdTask.job.name, createdTask.execution.name)

  await removeTemporaryJob(process.env.RG_NAME!, createdTask.job.name);

  return succeeded ? 0 : 1;
}

function createContainerDefinition(
  container: RunContainerStepArgs,
): Container {
  const volumeMounts = containerVolumes(undefined, false, true);
  return {
    name: JOB_CONTAINER_NAME,
    image: container.image,
    command: container.entryPoint
    ? [container.entryPoint]
    : undefined,
    args: container.entryPointArgs?.length
    ? fixArgs(container.entryPointArgs)
    : undefined,
    env: [
      ...Object.entries(container.environmentVariables).map(entry => {
        return {
          name: entry[0],
          value: entry[1] as string
        }
      }),
    ],
    resources: {
      cpu: 0.5,
      memory: '1Gi'
    },
    volumeMounts
  }
}
