import * as core from '@actions/core'
import { Task } from '@aws-sdk/client-ecs'
import { RunContainerStepArgs } from 'hooklib'
import { createTask, getPrepareJobTimeoutSeconds, pruneTask, waitForTaskRunning, waitForTaskStopped } from '../ecs'
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
    getPrepareJobTimeoutSeconds()
  )

  return 0;
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
      environment: Object.entries(container.environmentVariables ?? {}).map(entry => {
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
}
