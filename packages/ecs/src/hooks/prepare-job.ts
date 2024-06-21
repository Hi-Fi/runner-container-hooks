import * as core from '@actions/core'
import * as io from '@actions/io'
import { ContainerDefinition, Task } from '@aws-sdk/client-ecs'
import * as k8s from '@kubernetes/client-node'
import {
  JobContainerInfo,
  ContextPorts,
  PrepareJobArgs,
  writeToResponseFile
} from 'hooklib'
import path from 'path'
import {
  containerPorts,
  createTask,
  isTaskContainerAlpine,
  waitForTaskRunning,
  getPrepareJobTimeoutSeconds,
  pruneTask,
  Volume
} from '../ecs'
import {
  containerVolumes,
  DEFAULT_CONTAINER_ENTRY_POINT,
  DEFAULT_CONTAINER_ENTRY_POINT_ARGS,
  generateContainerName,
  readExtensionFromFile,
  fixArgs
} from '../ecs/utils'
import { JOB_CONTAINER_NAME } from './constants'

export interface TaskProperties {
  containerDefinition: ContainerDefinition
  volumes: Volume[]
}

export async function prepareJob(
  args: PrepareJobArgs,
  responseFile
): Promise<void> {
  if (!args.container) {
    throw new Error('Job Container is required.')
  }

  //await prunePods()

  core.debug("Reading extensions");
  const extension = readExtensionFromFile()
  core.debug("copying externals");
  const extarnalsCopy =  copyExternalsToRoot()

  core.info("Creating container definitions");
  let containerDefinition: TaskProperties | undefined = undefined
  if (args.container?.image) {
    core.debug(`Using image '${args.container.image}' for job image`)
    containerDefinition = createContainerDefinition(
      args.container,
      JOB_CONTAINER_NAME,
      true,
      extension
    )
  }

  let services: TaskProperties[] = []
  if (args.services?.length) {
    services = args.services.map(service => {
      core.debug(`Adding service '${service.image}' to pod definition`)
      return createContainerDefinition(
        service,
        generateContainerName(service.image),
        false,
        extension
      )
    })
  }

  if (!containerDefinition && !services?.length) {
    throw new Error('No containers exist, skipping hook invocation')
  }

  core.info("Creating task including containers");
  let createdTask: Task | undefined = undefined
  const volumes: Volume[] = [];
  volumes.push(...(containerDefinition?.volumes ?? []))
  services.forEach(service => {
    volumes.push(...service.volumes)
  })
  try {
    createdTask = await createTask(
      containerDefinition?.containerDefinition,
      services.map(service => service.containerDefinition),
      volumes,
      args.container.registry,
      extension
    )
  } catch (err) {
    core.debug(`createTask failed: ${JSON.stringify(err)}`)
    const message = (err as any)?.response?.body?.message || err
    throw new Error(`failed to create job task: ${message}`)
  }

  if (!createdTask?.taskArn) {
    throw new Error('created task should have ARN')
  }

  core.debug(
    `Job task created, waiting for it to come online ${createdTask.taskArn}`
  )

  try {
    await waitForTaskRunning(
      createdTask.taskArn,
      getPrepareJobTimeoutSeconds()
    )
  } catch (err) {
    await pruneTask()
    throw new Error(`task failed to come online with error: ${err}`)
  }

  // ln -s /tmp/_work/$EXECID _work

  // core.info("Creating needed volume paths as ECS doesn't support sub paths in mount");
  // core.debug(await execTaskStep(
  //   [
  //     "ln",
  //     "-s",
  //     "/__w/externals",
  //     "/__e"
  //   ],
  //   createdTask.taskArn,
  //   containerDefinition?.name!
  // ))

  core.debug('Job task is ready for traffic')

  let isAlpine = false
  try {
    isAlpine = await isTaskContainerAlpine(
      createdTask.taskArn,
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
  generateResponseFile(responseFile, createdTask, isAlpine)
  await extarnalsCopy;
}

function generateResponseFile(
  responseFile: string,
  appTask: Task,
  isAlpine
): void {
  if (!appTask.taskArn) {
    throw new Error('app task must have taskArn specified')
  }
  const response = {
    state: {
      jobPod: appTask.taskArn
    },
    context: {},
    isAlpine
  }

  const mainContainer = appTask.containers?.find(
    c => c.name === JOB_CONTAINER_NAME
  )
  if (mainContainer) {
    const mainContainerContextPorts: ContextPorts = {}
    if (mainContainer?.networkBindings) {
      for (const networkBinding of mainContainer.networkBindings) {
        mainContainerContextPorts[networkBinding.containerPort] =
          networkBinding.hostPort
      }
    }

    response.context['container'] = {
      image: mainContainer.image,
      ports: mainContainerContextPorts
    }
  }

  const serviceContainers = appTask.containers?.filter(
    c => c.name !== JOB_CONTAINER_NAME
  )
  if (serviceContainers?.length) {
    response.context['services'] = serviceContainers.map(c => {
      const ctxPorts: ContextPorts = {}
      c.networkBindings?.forEach(networkBinding => {
        ctxPorts[networkBinding.containerPort] = networkBinding.hostPort
      })

      return {
        image: c.image,
        ports: ctxPorts
      }
    })
  }
  writeToResponseFile(responseFile, JSON.stringify(response))
}

async function copyExternalsToRoot(): Promise<void> {
  const workspace = process.env['RUNNER_WORKSPACE']
  if (workspace) {
    await io.cp(
      path.join(workspace, '../../externals'),
      path.join(workspace, '../externals'),
      { force: true, recursive: true, copySourceDirectory: false }
    )
  }
}

export function createContainerDefinition(
  container: JobContainerInfo,
  name: string,
  jobContainer = false,
  _extension?: k8s.V1PodTemplateSpec
): TaskProperties {
  if (!container.entryPoint && jobContainer) {
    container.entryPoint = DEFAULT_CONTAINER_ENTRY_POINT
    container.entryPointArgs = DEFAULT_CONTAINER_ENTRY_POINT_ARGS
  }
  const volumeMOuntSettings = containerVolumes(container.userMountVolumes, jobContainer);
  return {
    containerDefinition: {
      name,
      image: container.image,
      portMappings: containerPorts(container),
      entryPoint: [container.entryPoint],
      command: fixArgs(container.entryPointArgs),
      workingDirectory: container.workingDirectory,
      cpu: 512,
      memory: 1024,
      environment: Object.entries(container.environmentVariables).map(entry => {
        return {
          name: entry[0],
          value: entry[1] as string
        }
      }),
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': `/ecs/GHA`,
          'awslogs-region': process.env.AWS_REGION ?? '',
          'awslogs-stream-prefix': name
        }
      },
      mountPoints: volumeMOuntSettings.mountPoints
    },
    volumes: volumeMOuntSettings.volumes
  }

  // podContainer.volumeMounts = containerVolumes(
  //   container.userMountVolumes,
  //   jobContainer
  // )

  // if (!extension) {
  //   return podContainer
  // }

  // const from = extension.spec?.containers?.find(
  //   c => c.name === CONTAINER_EXTENSION_PREFIX + name
  // )

  // if (from) {
  //   mergeContainerWithOptions(podContainer, from)
  // }

  // return podContainer
}
