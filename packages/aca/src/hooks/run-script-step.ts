/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from 'fs'
import { RunScriptStepArgs } from 'hooklib'
import { writeEntryPointScript } from '../aca/utils'
import { waitForJobCompletion } from 'src/watcher'

export async function runScriptStep(
  args: RunScriptStepArgs,
  state,
  responseFile
): Promise<void> {
  const { entryPoint, entryPointArgs, environmentVariables } = args
  const { runnerPath, jobId } = writeEntryPointScript(
    args.workingDirectory,
    entryPoint,
    entryPointArgs,
    args.prependPath,
    environmentVariables
  )

  const response = await waitForJobCompletion(jobId);
  fs.rmSync(runnerPath)
  const rc = await waitForJobCompletion(jobId)
  if (rc.trim() != "0" ) {
    throw new Error('execPodStep failed')
  }
}
