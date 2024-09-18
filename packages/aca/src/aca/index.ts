import * as core from '@actions/core'
import { Container, ContainerAppsAPIClient, Job, JobExecutionBase, KnownJobExecutionRunningState } from '@azure/arm-appcontainers'
import { DefaultAzureCredential } from '@azure/identity'
import { writeEntryPointScript } from './utils'
// import { waitForJobCompletion } from 'src/watcher'

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

/**
 * Wait for execution to stop. Polls job status for each 10 seconds.
 * @param resourceGroupName Resource group containing the waited job
 * @param jobName Name of the waited job
 * @param jobExecutionName Execution to wait for
 * @returns true if execution completed successfully, or false if there was an error.
 */
export async function waitJobToStop(resourceGroupName: string, jobName: string, jobExecutionName: string): Promise<boolean> {
  const finalStates = [
    KnownJobExecutionRunningState.Failed,
    KnownJobExecutionRunningState.Stopped,
    KnownJobExecutionRunningState.Succeeded,
  ].map(state => state.toString());
  return new Promise(resolve => {
    const timer = setInterval(async () => {
      const execution = await acaClient.jobExecution(resourceGroupName, jobName, jobExecutionName)
      core.debug(`Execution ${execution.id} (name: ${execution.name}) has now status ${execution.status}. End time is set to ${execution.endTime}`);
      if (execution.endTime || (execution.status && finalStates.includes(execution.status))) {
        core.debug(`Execution ${jobExecutionName} ended with status ${execution.status}`)
        clearInterval(timer);
        resolve(execution.status === KnownJobExecutionRunningState.Succeeded)
      }
    }, 10000)
  })
}

// export async function execTaskStep(
//   command: string[],
//   _taskArn: string,
//   _containerName: string,
// ): Promise<boolean> {

//   const { jobId } = writeEntryPointScript(
//     '.',
//     '', // No entrypoint, as it just concats with args
//     command,
//   )

//   const rc = await waitForJobCompletion(jobId)
//   return rc.trim() === "0"
// }

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

// export async function isTaskContainerAlpine(
//   taskArn: string,
//   containerName: string
// ): Promise<boolean> {
//   const output = await execTaskStep(
//     [
//       'sh',
//       '-c',
//       `'cat /etc/*release* | grep -i -e "^ID=*alpine*" > /dev/null'`
//     ],
//     taskArn,
//     containerName
//   )

//   return output
// }

export async function pruneTask(): Promise<void> {
  const startedBy = process.env.GITHUB_RUN_ID;
  const resourceGroup = process.env.RG_NAME!;
  core.debug(`Obtaining jobs with tag startedBy: ${startedBy} from resource group ${resourceGroup}`)

  const jobs = acaClient.jobs.listByResourceGroup(resourceGroup);

  const prunes: Promise<any>[] = [];
  
  core.debug(`Checking received jobs for specific tag: startedBy=${startedBy}`);

  // this loop works locally, but not when running in runner
  for await (const job of jobs) {
    core.debug(`Checking job ${job.name}. Tag startedBy=${job.tags?.startedBy}`)
    if (job.tags?.startedBy === startedBy && job.name) {
      prunes.push(removeTemporaryJob(resourceGroup, job.name))
    }
  }

  await Promise.all(prunes);
  core.debug(`Cleaned up ${prunes.length} jobs`)
}

export async function removeTemporaryJob(resourceGroupName: string, jobName: string) {
  core.debug(`Removing job ${jobName} from resource group ${resourceGroupName}`);
  return acaClient.jobs.beginDeleteAndWait(resourceGroupName, jobName);
}
