/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from 'fs'
import * as core from '@actions/core'
import { RunScriptStepArgs } from 'hooklib'
import { execTaskStep } from '../ecs'
import { writeEntryPointScript } from '../ecs/utils'
import { JOB_CONTAINER_NAME } from './constants'

export async function runScriptStep(
  args: RunScriptStepArgs,
  state,
  responseFile
): Promise<void> {
  const { entryPoint, entryPointArgs, environmentVariables } = args
  const { containerPath, runnerPath } = writeEntryPointScript(
    args.workingDirectory,
    entryPoint,
    entryPointArgs,
    args.prependPath,
    environmentVariables
  )

  try {
    const response = await execTaskStep(
      ['sh', containerPath],
      state.jobPod,
      JOB_CONTAINER_NAME
    )
    const matches = response.match(/SCRIPT_RUN_STATUS: (\d*)/);
    if (matches) {
      const returnCode = matches[1] ?? '0'
      core.info(response.replace(matches[0], ''))
      if (Number(returnCode) > 0) {
        throw new Error("execution failed")
      }
    }
  } catch (err) {
    core.debug(`execPodStep failed: ${JSON.stringify(err)}`)
    const message = (err as any)?.response?.body?.message || err
    throw new Error(`failed to run script step: ${message}`)
  } finally {
    fs.rmSync(runnerPath)
  }
}
