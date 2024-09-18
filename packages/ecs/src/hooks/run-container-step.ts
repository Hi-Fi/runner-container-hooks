import * as core from '@actions/core'
import { Task } from '@aws-sdk/client-ecs'
import { CloudWatchLogsClient, CreateLogStreamCommand, StartLiveTailCommand, StartLiveTailCommandOutput } from "@aws-sdk/client-cloudwatch-logs";
import { RunContainerStepArgs } from 'hooklib'
import { createTask, waitForTaskStopped } from 'src/ecs'
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

  const client = new CloudWatchLogsClient();

  const logGroupName = container.containerDefinition.logConfiguration?.options?.['awslogs-group'];
  const logStreamPrefix = container.containerDefinition.logConfiguration?.options?.['awslogs-stream-prefix'];


  if (logGroupName && logStreamPrefix) {
    const [_arn, _aws, _service, region, account, _task] = createdTask.taskArn.split(':');


    const logGroupArn = `arn:aws:logs:${region}:${account}:log-group:${logGroupName}`
    const logStreamName = `${logStreamPrefix}/${container.containerDefinition.name}/${createdTask.taskArn?.split('/').pop()}`;

    const createLogGroup = new CreateLogStreamCommand({
      logGroupName: logGroupName,
      logStreamName,
    })

    await client.send(createLogGroup)

    const command = new StartLiveTailCommand({
      logGroupIdentifiers: [
        logGroupArn
      ],
      logStreamNames: [
        logStreamName
      ],
    });

    // https://docs.aws.amazon.com/code-library/latest/ug/cloudwatch-logs_example_cloudwatch-logs_StartLiveTail_section.html
    try {
      try {
        core.debug(`Creating log stream ${createLogGroup.input.logStreamName} to log group ${createLogGroup.input.logGroupName} to be sure to have something to tail`);
        await client.send(createLogGroup)
      } catch (e) {
        const err = e as Error;
        core.debug(`Couldn't create tail stream. Error: ${err.message}`)
      }
      core.debug(`Trying to tail logs from task ${createdTask.taskArn}`);
      core.debug(`Using log group ${logGroupArn} and stream ${logStreamName}`);
      const response = await client.send(command);
      handleResponseAsync(response);
    } catch (e) {
      const err = e as Error;
      core.warning(`Couldn't tail logs. Error: ${err.message}`)
    }
  }

  core.debug(
    `Job task created, waiting for it to complete ${createdTask.taskArn}`
  )

  await waitForTaskStopped(
    createdTask.taskArn,
  )

  client.destroy();

  return 0;
}

async function handleResponseAsync(response: StartLiveTailCommandOutput) {
  if (response.responseStream)
    try {
      for await (const event of response.responseStream) {
        if (event.sessionStart !== undefined) {
          core.debug(JSON.stringify(event.sessionStart, null, 2));
        } else if (event.sessionUpdate !== undefined && event.sessionUpdate.sessionResults) {
          for (const logEvent of event.sessionUpdate.sessionResults) {
            console.log(logEvent.message);
          }
        } else {
          core.debug('Unknown event:');
          core.debug(JSON.stringify(event, null, 2));
        }
      }
    } catch (err) {
      // On-stream exceptions are captured here
      core.debug((err as Error).message)
    }
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
}
