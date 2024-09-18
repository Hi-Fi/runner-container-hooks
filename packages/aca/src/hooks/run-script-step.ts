/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from 'fs'
import { RunScriptStepArgs } from 'hooklib'
import { writeEntryPointScript } from '../aca/utils'
import { waitForJobCompletion } from 'src/watcher'

export async function runScriptStep(
  args: RunScriptStepArgs,
  _state,
  _responseFile
): Promise<void> {
  const { entryPoint, entryPointArgs, environmentVariables } = args
  const { runnerPath, jobId } = writeEntryPointScript(
    args.workingDirectory,
    entryPoint,
    entryPointArgs,
    args.prependPath,
    environmentVariables
  )

  const rc = await waitForJobCompletion(jobId)
  fs.rmSync(runnerPath)
  
  if (rc.trim() != "0" ) {
    throw new Error('execPodStep failed')
  }
}
