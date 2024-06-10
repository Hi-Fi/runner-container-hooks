import * as core from '@actions/core'
import { Task } from '@aws-sdk/client-ecs'
import { RunContainerStepArgs } from 'hooklib'
import { createTask, getPrepareJobTimeoutSeconds, pruneTask, waitForTaskRunning, waitForTaskStopped } from 'src/ecs'
import {
  containerVolumes,
  fixArgs
} from '../ecs/utils'
import { JOB_CONTAINER_NAME } from './constants'
import { TaskProperties } from './prepare-job'

export async function runContainerStep(
  stepContainer: RunContainerStepArgs
): Promise<number> {
  if (stepContainer.dockerfile) {
    throw new Error('Building container actions is not currently supported')
  }

  // let secretName: string | undefined = undefined
  // if (stepContainer.environmentVariables) {
  //   secretName = await createSecretForEnvs(stepContainer.environmentVariables)
  // }

  // const extension = readExtensionFromFile()

  // core.debug(`Created secret ${secretName} for container job envs`)
  const container = createContainerDefinition(stepContainer)

  let createdTask: Task | undefined = undefined

  try {
    createdTask = await createTask(
      container.containerDefinition,
      undefined,
      container.volumes
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

  await waitForTaskStopped(
    createdTask.taskArn,
  )

  return 0;


  // let job: k8s.V1Job
  // try {
  //   job = await createJob(container, extension)
  // } catch (err) {
  //   core.debug(`createJob failed: ${JSON.stringify(err)}`)
  //   const message = (err as any)?.response?.body?.message || err
  //   throw new Error(`failed to run script step: ${message}`)
  // }

  // if (!job.metadata?.name) {
  //   throw new Error(
  //     `Expected job ${JSON.stringify(
  //       job
  //     )} to have correctly set the metadata.name`
  //   )
  // }
  // core.debug(`Job created, waiting for pod to start: ${job.metadata?.name}`)

  // let podName: string
  // try {
  //   podName = await getContainerJobPodName(job.metadata.name)
  // } catch (err) {
  //   core.debug(`getContainerJobPodName failed: ${JSON.stringify(err)}`)
  //   const message = (err as any)?.response?.body?.message || err
  //   throw new Error(`failed to get container job pod name: ${message}`)
  // }

  // await waitForTaskRunning(
  //   podName,
  // )
  // core.debug('Container step is running or complete, pulling logs')

  // await getPodLogs(podName, JOB_CONTAINER_NAME)

  // core.debug('Waiting for container job to complete')
  // await waitForJobToComplete(job.metadata.name)

  // // pod has failed so pull the status code from the container
  // const status = await getPodStatus(podName)
  // if (status?.phase === 'Succeeded') {
  //   return 0
  // }
  // if (!status?.containerStatuses?.length) {
  //   core.error(
  //     `Can't determine container status from response:  ${JSON.stringify(
  //       status
  //     )}`
  //   )
  //   return 1
  // }
  // const exitCode =
  //   status.containerStatuses[status.containerStatuses.length - 1].state
  //     ?.terminated?.exitCode
  // return Number(exitCode) || 1
}

function createContainerDefinition(
  container: RunContainerStepArgs,
): TaskProperties {
  const volumeMOuntSettings = containerVolumes(undefined, false, true);
  return {
    containerDefinition: {
      name: JOB_CONTAINER_NAME,
      image: container.image,
      workingDirectory: container.workingDirectory,
      entryPoint: container.entryPoint
        ? [container.entryPoint]
        : undefined,
      command: container.entryPointArgs?.length
        ? fixArgs(container.entryPointArgs)
        : undefined,
      mountPoints: volumeMOuntSettings.mountPoints,
      environment: Object.entries(container.environmentVariables).map(entry => {
        return {
          name: entry[0],
          value: entry[1] as string
        }
      }),
      logConfiguration: {
        logDriver: 'awslogs',
        options: {
          'awslogs-group': '/ecs/GHA',
          'awslogs-region': process.env.AWS_REGION ?? '',
          'awslogs-stream-prefix': JOB_CONTAINER_NAME
        }
      },
    },
    volumes: volumeMOuntSettings.volumes
  }
  // const podContainer = new k8s.V1Container()
  // podContainer.name = JOB_CONTAINER_NAME
  // podContainer.image = container.image
  // podContainer.workingDir = container.workingDirectory
  // podContainer.command = container.entryPoint
  //   ? [container.entryPoint]
  //   : undefined
  // podContainer.args = container.entryPointArgs?.length
  //   ? fixArgs(container.entryPointArgs)
  //   : undefined

  // if (secretName) {
  //   podContainer.envFrom = [
  //     {
  //       secretRef: {
  //         name: secretName,
  //         optional: false
  //       }
  //     }
  //   ]
  // }
  // podContainer.volumeMounts = containerVolumes(undefined, false, true)

  // if (!extension) {
  //   return podContainer
  // }

  // const from = extension.spec?.containers?.find(
  //   c => c.name === JOB_CONTAINER_EXTENSION_NAME
  // )
  // if (from) {
  //   mergeContainerWithOptions(podContainer, from)
  // }

  // return podContainer
}
