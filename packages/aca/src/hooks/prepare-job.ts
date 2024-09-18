import * as core from '@actions/core'
import * as io from '@actions/io'
import {
  JobContainerInfo,
  PrepareJobArgs,
  writeToResponseFile
} from 'hooklib'
import path from 'path'
import {
  createJob,
  CreateJobResponse,
  isTaskContainerAlpine,
  pruneTask,
} from '../aca'
import {
  containerVolumes,
  DEFAULT_CONTAINER_ENTRY_POINT,
  generateContainerName,
  fixArgs
} from '../aca/utils'
import { JOB_CONTAINER_NAME, RUNNER_WORKSPACE } from './constants'
import { Container } from '@azure/arm-appcontainers'
import { existsSync, readFileSync } from 'fs'

export async function prepareJob(
  args: PrepareJobArgs,
  responseFile
): Promise<void> {
  if (!args.container) {
    throw new Error('Job Container is required.')
  }

  core.debug("copying externals");
  await copyExternalsToRoot()

  core.info("Creating container definitions");
  let containerDefinition: Container | undefined = undefined
  if (args.container?.image) {
    core.debug(`Using image '${args.container.image}' for job image`)
    containerDefinition = createContainerDefinition(
      args.container,
      JOB_CONTAINER_NAME,
      true,
    )
  }

  let services: Container[] = []
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

  if (!createdJob?.execution.id) {
    throw new Error('created task should have ID')
  }

  core.debug(
    `Job task created, waiting for it to come online ${createdJob.execution.id}`
  )

  core.debug('Job task is ready for traffic')

  let isAlpine = false
  try {
    isAlpine = await isTaskContainerAlpine(
      createdJob.execution.id,
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

function generateResponseFile(
  responseFile: string,
  job: CreateJobResponse,
  isAlpine
): void {
  if (!job.execution.id) {
    throw new Error('job execution must have id specified')
  }
  const response = {
    state: {
      jobPod: job.execution.id
    },
    context: {},
    isAlpine
  }

  const mainContainer = job.job.template?.containers?.find(
    c => c.name === JOB_CONTAINER_NAME
  )
  if (mainContainer) {

    response.context['container'] = {
      image: mainContainer.image,
      ports: {}
    }
  }

  const serviceContainers = job.job.template?.containers?.filter(
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
      existsSync('/tmp/externals/externals.sum') &&
      readFileSync(path.join(workspace, '../../externals/externals.sum'), 'utf8') === readFileSync('/tmp/externals/externals.sum', 'utf8')
    ) {
      core.info('Provided externals version already exists at target, no need to copy');
    } else {
      core.debug('Copying externals');
      // We need server binary at new job, so have to wait here
      await io.cp(
        path.join(workspace, '../../externals'),
        '/tmp/externals',
        { force: true, recursive: true, copySourceDirectory: false }
      )
    }
  }
}

export function createContainerDefinition(
  container: JobContainerInfo,
  name: string,
  jobContainer = false,
): Container {
  if (!container.entryPoint && jobContainer) {
    container.entryPoint = DEFAULT_CONTAINER_ENTRY_POINT
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
        cpu: 0.5,
        memory: '1Gi'
      },
      volumeMounts,
  }
}
