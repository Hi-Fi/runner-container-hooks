import * as core from '@actions/core'
import {
  JobContainerInfo,
  PrepareJobArgs,
  writeToResponseFile
} from 'hooklib'
import path, { join } from 'path'
import {
  createJob,
  CreateJobResponse,
  isTaskContainerAlpine,
  pruneTask,
} from '../cloudrun'
import {
  containerVolumes,
  DEFAULT_CONTAINER_ENTRY_POINT,
  generateContainerName,
  fixArgs
} from '../cloudrun/utils'
import { JOB_CONTAINER_NAME, RUNNER_WORKSPACE } from './constants'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { type google } from '@google-cloud/run/build/protos/protos'
import { exec } from '@actions/exec'

export async function prepareJob(
  args: PrepareJobArgs,
  responseFile
): Promise<void> {
  if (!args.container) {
    throw new Error('Job Container is required.')
  }

  core.debug("copying externals");
  await copyExternalsToRoot()


  createContainerJobStartupScript();
  core.info("Creating container definitions");
  let containerDefinition: google.cloud.run.v2.IContainer | undefined = undefined
  if (args.container?.image) {
    core.debug(`Using image '${args.container.image}' for job image`)
    containerDefinition = createContainerDefinition(
      args.container,
      JOB_CONTAINER_NAME,
      true,
    )
  }

  let services: google.cloud.run.v2.IContainer[] = []
  if (args.services?.length) {
    services = args.services.map(service => {
      core.debug(`Adding service '${service.image}' to pod definition`)
      return createContainerDefinition(
        service,
        generateContainerName(service.image),
        false,
      )
    })
  }

  if (!containerDefinition && !services?.length) {
    throw new Error('No containers exist, skipping hook invocation')
  }

  core.info("Creating task including containers");
  let createdJob: CreateJobResponse | undefined = undefined
  
  try {
    createdJob = await createJob(
      containerDefinition,
      services,
    )
  } catch (err) {
    core.debug(`createTask failed: ${JSON.stringify(err)}`)
    const message = (err as any)?.response?.body?.message || err
    await pruneTask()
    throw new Error(`failed to create job task: ${message}`)
  }

  if (!createdJob?.runOperation.name) {
    throw new Error('created runOperation should have name')
  }

  let isAlpine = false
  try {
    isAlpine = await isTaskContainerAlpine(
      createdJob.runOperation.name,
      JOB_CONTAINER_NAME
    )
  } catch (err) {
    core.debug(
      `Failed to determine if the task is alpine: ${JSON.stringify(err)}`
    )
    const message = (err as any)?.response?.body?.message || err
    throw new Error(`failed to determine if the task is alpine: ${message}`)
  }
  core.debug(`Setting isAlpine to ${isAlpine}`)
  // generateResponseFile(responseFile, createdJob, isAlpine)
  generateResponseFile(responseFile, createdJob, isAlpine)
}

function createContainerJobStartupScript() {
  const content = `#!/bin/sh

ln -s /__w/_temp/_github_home /github/home
ln -s /__w/_temp/_github_workflow /github/workflow 

echo "Copy nodes"
mkdir -p /__b/node16
mkdir -p /__b/node20 
mkdir -p /__b/node16_alpine
mkdir -p /__b/node20_alpine

ls -l /
ls -l /__e/
ls -l /__e/node16
cp /__e/node16/bin/node.bin /__b/node16/node 
cp /__e/node20/bin/node.bin /__b/node20/node 
cp /__e/node16_alpine/bin/node.bin /__b/node16_alpine/node 
cp /__e/node20_alpine/bin/node.bin /__b/node20_alpine/node 

cp /__e/executor /__b/executor 
chmod 777 -R /__b/
/__b/executor 

`
  writeFileSync(join(process.env.RUNNER_TEMP!, '..', 'start_job_container.sh'), content, {encoding: 'utf8'});
}

function generateResponseFile(
  responseFile: string,
  job: CreateJobResponse,
  isAlpine
): void {
  const response = {
    state: {
      jobPod: job.job.latestCreatedExecution?.name ?? 'test-task'
    },
    context: {},
    isAlpine
  }

  const mainContainer = job.job.template?.template?.containers?.find(
    c => c.name === JOB_CONTAINER_NAME
  )
  if (mainContainer) {

    response.context['container'] = {
      image: mainContainer.image,
      ports: {}
    }
  }

  const serviceContainers = job.job.template?.template?.containers?.filter(
    c => c.name !== JOB_CONTAINER_NAME
  )
  if (serviceContainers?.length) {
    response.context['services'] = serviceContainers.map(c => {
      return {
        image: c.image,
        ports: {}
      }
    })
  }
  writeToResponseFile(responseFile, JSON.stringify(response))
}

/**
 * Copies externals from runner to shared volume usable by tasks. Target directory /tmp/externals is mapped in runner creation in autoscaler app
 */
async function copyExternalsToRoot(): Promise<void> {
  const workspace = RUNNER_WORKSPACE
  if (workspace) {
    if (
      existsSync(path.join(workspace, '../../externals/externals.sum')) && 
      existsSync(path.join(workspace, '../externals/externals.sum')) &&
      readFileSync(path.join(workspace, '../../externals/externals.sum'), 'utf8') === readFileSync(path.join(workspace, '../externals/externals.sum'), 'utf8')
    ) {
      core.info('Provided externals version already exists at target, no need to copy');
    } else {
      core.debug('Copying externals');
      // We need server binary at new job, so have to wait here
      // io.cp can't be used as does something that normal user can't do with FUSE:
      // Error: EPERM: operation not permitted, copyfile '/home/runner/externals/externals.sum' -> '/home/runner/_work/externals/externals.sum'
      // Might be this https://github.com/actions/toolkit/blob/main/packages/io/src/io.ts#L308-L315 or some fs.promises internal thing
      // await io.cp(
      //   path.join(workspace, '../../externals'),
      //   path.join(workspace, '../externals'),
      //   { force: true, recursive: true, copySourceDirectory: false }
      // )
      await exec('cp', ['-u', '-R', path.join(workspace, '../../externals'), path.join(workspace, '..')])
      core.debug('Externals copied');
    }
  }
}

export function createContainerDefinition(
  container: JobContainerInfo,
  name: string,
  jobContainer = false,
): google.cloud.run.v2.IContainer {
  if (!container.entryPoint && jobContainer) {
    //container.entryPoint = DEFAULT_CONTAINER_ENTRY_POINT

    // TODO: Entrypoint for PoC to handle file rights issues
    container.entryPoint = ['/bin/sh']
    container.entryPointArgs = [
      '/__w/start_job_container.sh'
    ]
    // container.entryPointArgs = ['-c', '"mkdir -p /__b/node16 && mkdir -p /__b/node20 && cp /__e/node16/node.bin /__b/node16/node && cp /__e/node20/node.bin /__b/node20/node && chmod 777 /__b/node16/node && /__b/node20/node && cp /__e/executor /__b/executor && chmod 777 /__b/executor && /__b/executor"']
  }
  const volumeMounts = containerVolumes(container.userMountVolumes, jobContainer);
  return {
      name,
      image: container.image,
      command: container.entryPoint ? [container.entryPoint]: undefined,
      args: container.entryPointArgs ? fixArgs(container.entryPointArgs): undefined,
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
          cpu: '0.5',
          memory: '1Gi'
        }
      },
      volumeMounts,
  }
}
