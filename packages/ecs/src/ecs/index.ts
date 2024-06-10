import * as core from '@actions/core'
import { AssignPublicIp, ContainerDefinition, DeleteTaskDefinitionsCommand, DeregisterTaskDefinitionCommand, DescribeTaskDefinitionCommand, DescribeTasksCommand, ECSClient, ExecuteCommandCommand, ExecuteCommandCommandInput, ExecuteCommandCommandOutput, InvalidParameterException, ListTaskDefinitionsCommand, ListTasksCommand, NetworkMode, PortMapping, RegisterTaskDefinitionCommand, RunTaskCommand, StopTaskCommand, Task, TaskDefinitionStatus, waitUntilTasksRunning, waitUntilTasksStopped } from '@aws-sdk/client-ecs'
import * as k8s from '@kubernetes/client-node'
import { ContainerInfo, Registry } from 'hooklib'
import {
  getJobPodName,
} from '../hooks/constants'
import {
  fixArgs,
  handleWebsocket
} from './utils'
import { join } from 'path'

const ecsClient = new ECSClient()

const cluster = process.env.ECS_CLUSTER_NAME;

const DEFAULT_WAIT_FOR_POD_TIME_SECONDS = 10 * 60 // 10 min

export const POD_VOLUME_NAME = 'work'

export const requiredPermissions = [
  {
    group: '',
    verbs: ['get', 'list', 'create', 'delete'],
    resource: 'pods',
    subresource: ''
  },
  {
    group: '',
    verbs: ['get', 'create'],
    resource: 'pods',
    subresource: 'exec'
  },
  {
    group: '',
    verbs: ['get', 'list', 'watch'],
    resource: 'pods',
    subresource: 'log'
  },
  {
    group: 'batch',
    verbs: ['get', 'list', 'create', 'delete'],
    resource: 'jobs',
    subresource: ''
  },
  {
    group: '',
    verbs: ['create', 'delete', 'get', 'list'],
    resource: 'secrets',
    subresource: ''
  }
]

export interface Volume {
  name: string
  rootDirectory?: string
}

export async function createTask(
  jobTaskProperties?: ContainerDefinition,
  services?: ContainerDefinition[],
  volumes?: Volume[],
  _registry?: Registry,
  _extension?: k8s.V1PodTemplateSpec
): Promise<Task> {
  const containers: ContainerDefinition[] = []
  if (jobTaskProperties) {
    containers.push(jobTaskProperties)
  }
  if (services?.length) {
    containers.push(...services)
  }

  // if (registry) {
  //   const secret = await createDockerSecret(registry)
  //   if (!secret?.metadata?.name) {
  //     throw new Error(`created secret does not have secret.metadata.name`)
  //   }
  //   const secretReference = new k8s.V1LocalObjectReference()
  //   secretReference.name = secret.metadata.name
  //   appDefinition.spec.imagePullSecrets = [secretReference]
  // }

  // if (extension?.metadata) {
  //   mergeObjectMeta(appDefinition, extension.metadata)
  // }

  // if (extension?.spec) {
  //   mergePodSpecWithOptions(appDefinition.spec, extension.spec)
  // }

  const taskCpu = containers.reduce((cpus, { cpu }) => {
    return cpus + (cpu || 0)
  }, 0)
  const taskMemory = containers.reduce((memories, { memory }) => {
    return memories + (memory || 0)
  }, 0)
  const storeTaskDefinitionCommand = new RegisterTaskDefinitionCommand({
    containerDefinitions: containers,
    family: getJobPodName(),
    volumes: volumes?.filter((volume1, i, volumeArray) => volumeArray.findIndex(volume2 => volume2.name === volume1.name) === i).map(volume => {
      const rootDirectory = !process.env.EXECID && !volume.rootDirectory ? undefined : join(process.env.EXECID ?? '', volume.rootDirectory ?? '');
      return {
        name: volume.name,
        efsVolumeConfiguration: {
          fileSystemId: process.env.EFS_ID,
          rootDirectory
        }
      }
    }),
    requiresCompatibilities: [
      'FARGATE'
    ],
    networkMode: NetworkMode.AWSVPC,
    cpu: (taskCpu || 256).toString(),
    memory: (taskMemory || 512).toString(),
    executionRoleArn: process.env.ECS_EXECUTION_ROLE,
    taskRoleArn: process.env.ECS_TASK_ROLE,
    tags: [
      {
        key: 'GITHUB_RUN_ID',
        value: process.env.GITHUB_RUN_ID
      }
    ]
  });

  const taskDefinition = await ecsClient.send(storeTaskDefinitionCommand);

  const runTaskCommand = new RunTaskCommand({
    taskDefinition: taskDefinition.taskDefinition?.taskDefinitionArn,
    cluster,
    launchType: 'FARGATE',
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: process.env.ECS_SUBNETS?.split(","),
        securityGroups: process.env.ECS_SECURITY_GROUPS?.split(","),
        assignPublicIp: AssignPublicIp.ENABLED
      }
    },
    enableExecuteCommand: true,
    startedBy: process.env.GITHUB_RUN_ID,
    tags: [
      {
        key: 'GITHUB_RUN_ID',
        value: process.env.GITHUB_RUN_ID
      }
    ]
  })
  const response = await ecsClient.send(runTaskCommand)

  if (!response.tasks) {
    throw new Error('No tasks creted')
  }

  return response.tasks[0];
}

export async function execTaskStep(
  command: string[],
  taskArn: string,
  containerName: string,
): Promise<string> {

  //command = fixArgs(command)
  const execCommand: ExecuteCommandCommandInput = {
    command: command.join(' '),
    interactive: true,
    task: taskArn,
    container: containerName,
    cluster
  }
  let response: ExecuteCommandCommandOutput = {
    $metadata: {}
  };

  // Task can be running without having SSM agent available, so trying couple of times. Subsequent execs should pass on first try.
  for (let index = 0; index < 3; index++) {
    try {
      response = await ecsClient.send(new ExecuteCommandCommand(execCommand));
      break;
    } catch (e: any) {
      if (e instanceof InvalidParameterException) {
        // wait for a moment, as probably task is not really running yet
        await new Promise(resolve => setTimeout(resolve, 2000))
      } else {
        throw e;
      }
    }
  }

  return await handleWebsocket(response.session);

}

export async function waitForJobToComplete(jobName: string): Promise<void> {
  const backOffManager = new BackOffManager()
  while (true) {
    try {
      if (await isTaskSucceeded(jobName)) {
        return
      }
    } catch (error) {
      throw new Error(`job ${jobName} has failed`)
    }
    await backOffManager.backOff()
  }
}

export async function waitForTaskRunning(
  taskArn: string,
  maxTimeSeconds = DEFAULT_WAIT_FOR_POD_TIME_SECONDS
): Promise<void> {

  const results = await waitUntilTasksRunning({
    client: ecsClient,
    maxWaitTime: maxTimeSeconds,
  }, {
    tasks: [
      taskArn
    ],
    cluster
  });

  if (results.state != "SUCCESS") {
    throw new Error(`Task ${taskArn} is unhealthy with phase status ${results.state} and reason ${results.reason}`)
  }
}

export async function waitForTaskStopped(
  taskArn: string,
  maxTimeSeconds = DEFAULT_WAIT_FOR_POD_TIME_SECONDS
): Promise<void> {

  const results = await waitUntilTasksStopped({
    client: ecsClient,
    maxWaitTime: maxTimeSeconds,
  }, {
    tasks: [
      taskArn
    ],
    cluster
  });

  const stoppedTask = await ecsClient.send(new DescribeTasksCommand({
    tasks: [
      taskArn
    ],
    cluster
  }));

  core.debug(`Step stop code: ${stoppedTask.tasks?.[0].stopCode}`)
  core.debug(`Step reason code: ${stoppedTask.tasks?.[0].stoppedReason}`)

  if (stoppedTask.tasks?.[0].stoppedReason?.includes('Error')) {
    throw new Error(stoppedTask.tasks?.[0].stoppedReason);
  }
}

export function getPrepareJobTimeoutSeconds(): number {
  const envTimeoutSeconds =
    process.env['ACTIONS_RUNNER_PREPARE_JOB_TIMEOUT_SECONDS']

  if (!envTimeoutSeconds) {
    return DEFAULT_WAIT_FOR_POD_TIME_SECONDS
  }

  const timeoutSeconds = parseInt(envTimeoutSeconds, 10)
  if (!timeoutSeconds || timeoutSeconds <= 0) {
    core.warning(
      `Prepare job timeout is invalid ("${timeoutSeconds}"): use an int > 0`
    )
    return DEFAULT_WAIT_FOR_POD_TIME_SECONDS
  }

  return timeoutSeconds
}

async function isTaskSucceeded(taskArn: string): Promise<boolean> {
  const command = new DescribeTasksCommand({
    tasks: [
      taskArn
    ],
    cluster
  });

  const response = await ecsClient.send(command);
  return response.failures?.length === 0;
}

export async function isTaskContainerAlpine(
  taskArn: string,
  containerName: string
): Promise<boolean> {
  const output = await execTaskStep(
    [
      'sh',
      '-c',
      `'cat /etc/*release* | grep -i -e "^ID=*alpine*" > /dev/null ; echo $?'`
    ],
    taskArn,
    containerName
  )

  return output.trim() === '0'
}

class BackOffManager {
  private backOffSeconds = 1
  totalTime = 0
  constructor(private throwAfterSeconds?: number) {
    if (!throwAfterSeconds || throwAfterSeconds < 0) {
      this.throwAfterSeconds = undefined
    }
  }

  async backOff(): Promise<void> {
    await new Promise(resolve =>
      setTimeout(resolve, this.backOffSeconds * 1000)
    )
    this.totalTime += this.backOffSeconds
    if (this.throwAfterSeconds && this.throwAfterSeconds < this.totalTime) {
      throw new Error('backoff timeout')
    }
    if (this.backOffSeconds < 20) {
      this.backOffSeconds *= 2
    }
    if (this.backOffSeconds > 20) {
      this.backOffSeconds = 20
    }
  }
}

export function containerPorts(
  container: ContainerInfo
): PortMapping[] {
  const ports: PortMapping[] = []
  if (!container.portMappings?.length) {
    return ports
  }
  for (const portDefinition of container.portMappings) {
    const portProtoSplit = portDefinition.split('/')
    if (portProtoSplit.length > 2) {
      throw new Error(`Unexpected port format: ${portDefinition}`)
    }


    const port: PortMapping = {
      protocol: portProtoSplit.length === 2 ? portProtoSplit[1].toUpperCase() : 'TCP',
    }

    const portSplit = portProtoSplit[0].split(':')
    if (portSplit.length > 2) {
      throw new Error('ports should have at most one ":" separator')
    }

    const parsePort = (p: string): number => {
      const num = Number(p)
      if (!Number.isInteger(num) || num < 1 || num > 65535) {
        throw new Error(`invalid container port: ${p}`)
      }
      return num
    }

    if (portSplit.length === 1) {
      port.containerPort = parsePort(portSplit[0])
    } else {
      port.hostPort = parsePort(portSplit[0])
      port.containerPort = parsePort(portSplit[1])
    }

    ports.push(port)
  }
  return ports
}

export async function pruneTask(): Promise<void> {
  const startedBy = process.env.GITHUB_RUN_ID;
  core.debug(`Obtaining tasks started by ${startedBy}`)

  const getTaskCommand = new ListTasksCommand({
    cluster,
    startedBy,
  });
  const tasks = await ecsClient.send(getTaskCommand);

  core.debug(`Obtained tasks ${tasks.taskArns?.join(', ')}`)

  await Promise.all(tasks.taskArns?.map(async taskArn => {
    const stopTaskCommand = new StopTaskCommand({
      task: taskArn,
      cluster,
      reason: 'Pruning tasks'
    })
    core.debug(`Stopping task ${taskArn}`)
    try {
      return ecsClient.send(stopTaskCommand)
    } catch (e: any) {
      core.warning(`failed to stop task ${taskArn}. Reason: ${e}`)
    }
  }) || [])
}

export async function pruneTaskDefinitions(): Promise<void> {
  core.debug(`Getting task definitions for family ${getJobPodName()}`)
  const listTaskDefinitionsCommand = new ListTaskDefinitionsCommand({
    familyPrefix: getJobPodName(),
    status: TaskDefinitionStatus.ACTIVE
  });
  const taskDefinitions = await ecsClient.send(listTaskDefinitionsCommand)
  core.debug(`Received task definitions ${taskDefinitions.taskDefinitionArns?.join(', ')}`);
  await Promise.all(taskDefinitions.taskDefinitionArns?.map(async taskDefinitionArn => {
    try {
      const taskDefinition = await ecsClient.send(new DescribeTaskDefinitionCommand({
        taskDefinition: taskDefinitionArn,
        include: ['TAGS']
      }))
      core.debug(`Checking task definition ${taskDefinitionArn} with tags ${JSON.stringify(taskDefinition.tags)}`);

      if (taskDefinition.tags?.some(tag => (tag.key === 'GITHUB_RUN_ID' && tag.value === process.env.GITHUB_RUN_ID))) {
        core.debug(`Deregistering task definition ${taskDefinitionArn}`);
        await ecsClient.send(new DeregisterTaskDefinitionCommand({
          taskDefinition: taskDefinitionArn
        }))

        core.debug(`Deleting task definition ${taskDefinitionArn}`);
        return ecsClient.send(new DeleteTaskDefinitionsCommand({
          taskDefinitions: [
            taskDefinitionArn
          ]
        }))
      }
    } catch (e) {
      core.warning(`failed to clean task definition ${taskDefinitionArn}. Reason: ${e}`)
    }
  }) || [])
}