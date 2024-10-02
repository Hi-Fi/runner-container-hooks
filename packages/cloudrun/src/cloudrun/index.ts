import * as core from '@actions/core'
import { writeEntryPointScript } from './utils'
import { waitForJobCompletion } from 'src/watcher'
import { ExecutionsClient, JobsClient } from '@google-cloud/run';
import { type google } from '@google-cloud/run/build/protos/protos';
import { type LROperation } from 'google-gax'

const runClient = new JobsClient();
const executionClient = new ExecutionsClient();

const DEFAULT_WAIT_FOR_POD_TIME_SECONDS = 10 * 60 // 10 min

export const POD_VOLUME_NAME = 'work'
export const EXTERNALS_VOLUME_NAME = 'externals'
export const BINARIES_VOLUME_NAME = 'binaries'
export const GITHUB_VOLUME_NAME = 'github'

export interface CreateJobResponse {
  job: google.cloud.run.v2.IJob
  runOperation: LROperation<google.cloud.run.v2.IExecution, google.cloud.run.v2.IExecution>
}

export async function createJob(
  jobTaskProperties?: google.cloud.run.v2.IContainer,
  services?: google.cloud.run.v2.IContainer[],
): Promise<CreateJobResponse> {
  const containers: google.cloud.run.v2.IContainer[] = []
  if (jobTaskProperties) {
    containers.push(jobTaskProperties)
  }
  if (services?.length) {
    containers.push(...services)
  }
  
  const name = `job-task-${Date.now()}`;
  const jobEnvelope: google.cloud.run.v2.IJob = {
    launchStage: 'BETA',
    template: {
      template: {
        containers,
        // TODO: parametrize
        serviceAccount: 'gha-runner-job-sa@gha-runner-example.iam.gserviceaccount.com',
        maxRetries: 0,
        volumes: [
          {
            name: POD_VOLUME_NAME,
            gcs: {
              bucket: process.env.STORAGE_NAME!
            }
          },
          {
            name: EXTERNALS_VOLUME_NAME,
            gcs: {
              bucket: process.env.EXTERNAL_STORAGE_NAME!
            }
          },
          {
            name: BINARIES_VOLUME_NAME,
            emptyDir: {}
          },
          {
            name: GITHUB_VOLUME_NAME,
            emptyDir: {}
          }
        ]
      },
    },
    labels: {
      startedBy: process.env.GITHUB_RUN_ID ?? ''
    }
  };

  core.debug(JSON.stringify(jobEnvelope));
  const parent = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/${process.env.CLOUDSDK_RUN_REGION}`
  const [createOperation]  = await runClient.createJob(
    {
      parent,
      jobId: name,
      job: jobEnvelope,
    },
  )

  core.debug(`Waiting for job creation to complete using operation ${createOperation.name}`)
  const [job] = await createOperation.promise()

  const [runOperation] = await runClient.runJob({
    name: job.name,
  })

  return {
    job,
    runOperation
  }
}

/**
 * Wait for execution to stop. Polls job status for each 10 seconds.
 * @param jobExecutionName Execution to wait for. Format: projects/{project}/locations/{location}/jobs/{job}/executions/{execution}
 * @returns true if execution completed successfully, or false if there was an error.
 */
export async function waitJobToStop(jobExecutionName: string): Promise<boolean> {
  return new Promise(resolve => {
    const timer = setInterval(async () => {
      const execution = (await executionClient.getExecution({
        name: jobExecutionName
      }))[0];
      if (execution.completionTime) {

        core.debug(`Execution ${jobExecutionName} ended with failedCount ${execution.failedCount}} and succeededCount ${execution.succeededCount}`)
        clearInterval(timer);

        resolve(execution.succeededCount && execution.succeededCount > 0 ? true : false  )
      }
    }, 10000)
  })
}

export async function execTaskStep(
  command: string[],
  _taskArn: string,
  _containerName: string,
): Promise<boolean> {

  const { jobId } = writeEntryPointScript(
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
  const parent = `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/${process.env.CLOUDSDK_RUN_REGION}`
  core.debug(`Obtaining jobs with label startedBy: ${startedBy} from parent ${parent}`)

  const jobs = runClient.listJobsAsync({
    parent
  })
  const prunes: Promise<any>[] = [];
  
  core.debug(`Checking received jobs for specific label: startedBy=${startedBy}`);

  // this loop works locally, but not when running in runner
  for await (const job of jobs) {
    core.debug(`Checking job ${job.name}. Label startedBy=${job.labels?.startedBy}`)
    if (job.labels?.startedBy === startedBy && job.name) {
      const jobName = job.name.startsWith(parent) ? job.name : `${parent}/jobs/${job.name}`
      prunes.push(removeTemporaryJob(jobName))
    }
  }

  await Promise.all(prunes);
  core.debug(`Cleaned up ${prunes.length} jobs`)
}

export async function removeTemporaryJob(jobFullName: string) {
  core.debug(`Removing job ${jobFullName}`);
  return (await runClient.deleteJob({
    // projects/{project}/locations/{location}/jobs/{job},
    name: jobFullName
  }))[0].promise()
}
