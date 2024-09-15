import * as core from '@actions/core'
import { Container, ContainerAppsAPIClient, Job, JobExecutionBase } from '@azure/arm-appcontainers'
import { DefaultAzureCredential } from '@azure/identity'
import { writeEntryPointScript } from './utils'
import { waitForJobCompletion } from 'src/watcher'

const subscriptionId = process.env.SUBSCRIPTION_ID ?? "00000000-0000-0000-0000-000000000000";

const acaClient = new ContainerAppsAPIClient(new DefaultAzureCredential(), subscriptionId);

const DEFAULT_WAIT_FOR_POD_TIME_SECONDS = 10 * 60 // 10 min

export const POD_VOLUME_NAME = 'work'
export const EXTERNALS_VOLUME_NAME = 'externals'

export interface CreateJobResponse {
  job: Job
  execution: JobExecutionBase
}

export async function createJob(
  jobTaskProperties?: Container,
  services?: Container[],
): Promise<CreateJobResponse> {
  const containers: Container[] = []
  if (jobTaskProperties) {
    containers.push(jobTaskProperties)
  }
  if (services?.length) {
    containers.push(...services)
  }

  const jobEnvelope: Job = {
    location: 'westeurope',
    configuration: {
      triggerType: 'Manual',
      replicaTimeout: 1800,
      replicaRetryLimit: 0,
      manualTriggerConfig: {
        parallelism: 1,
        replicaCompletionCount: 1
      },
    },
    environmentId: process.env.ACA_ENVIRONMENT_ID,
    template: {
      containers,
      volumes: [
        {
          name: POD_VOLUME_NAME,
          storageName: process.env.STORAGE_NAME!,
          storageType: 'AzureFile',
          mountOptions: 'mfsymlinks'
        },
        {
          name: EXTERNALS_VOLUME_NAME,
          storageName: process.env.EXTERNAL_STORAGE_NAME!,
          storageType: 'AzureFile',
          mountOptions: 'mfsymlinks'
        }
      ]
    },
    tags: {
      startedBy: process.env.GITHUB_RUN_ID ?? ''
    }
  };

  core.debug(JSON.stringify(jobEnvelope));
  const job = await acaClient.jobs.beginCreateOrUpdateAndWait(
    process.env.RG_NAME!,
    `job-task-${Date.now()}`,
    jobEnvelope,
  )

  const execution = await acaClient.jobs.beginStartAndWait(
    process.env.RG_NAME!,
    job.name!,
  )

  if (!execution.id) {
    throw new Error('No job execution creted')
  }

  return {
    job,
    execution
  }
}

export async function execTaskStep(
  command: string[],
  _taskArn: string,
  _containerName: string,
): Promise<boolean> {

  const {jobId} = writeEntryPointScript(
    '.',
    '', // No entrypoint, as it just concats with args
    command,
  )

  const rc = await waitForJobCompletion(jobId)
  return rc.trim() === "0"
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

export async function isTaskContainerAlpine(
  taskArn: string,
  containerName: string
): Promise<boolean> {
  const output = await execTaskStep(
    [
      'sh',
      '-c',
      `'cat /etc/*release* | grep -i -e "^ID=*alpine*" > /dev/null'`
    ],
    taskArn,
    containerName
  )

  return output
}

export async function pruneTask(): Promise<void> {
  const startedBy = process.env.GITHUB_RUN_ID;
  const resourceGroup = process.env.RG_NAME!;
  core.debug(`Obtaining jobs with tag startedBy: ${startedBy}`)

  const jobs = acaClient.jobs.listByResourceGroup(process.env.RG_NAME!);

  const prunes: Promise<any>[] = [];
  for await (const job of jobs) {
    if (job.tags?.startedBy === startedBy && job.name) {
      core.debug(`Deleting job ${job.name}`)
      prunes.push(acaClient.jobs.beginDelete(resourceGroup, job.name))
    }
  } 
}
