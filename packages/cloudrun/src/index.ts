import * as core from '@actions/core'
import { Command, getInputFromStdin, prepareJobArgs } from 'hooklib'
import {
  cleanupJob,
  prepareJob,
  runContainerStep,
  runScriptStep
} from './hooks'

async function run(): Promise<void> {
  try {
    const input = await getInputFromStdin()

    const args = input['args']
    const command = input['command']
    const responseFile = input['responseFile']
    const state = input['state']

    let exitCode = 0
    core.debug(`Selecting to act against ${command} (state ${state})`)
    switch (command) {
      case Command.PrepareJob:
        await prepareJob(args as prepareJobArgs, responseFile)
        return process.exit(0)
      case Command.CleanupJob:
        await cleanupJob()
        return process.exit(0)
      case Command.RunScriptStep:
        await runScriptStep(args, state, responseFile)
        return process.exit(0)
      case Command.RunContainerStep:
        exitCode = await runContainerStep(args)
        return process.exit(exitCode)
      default:
        throw new Error(`Command not recognized: ${command}`)
    }
  } catch (error) {
    core.error(error as Error)
    process.exit(1)
  }
}

void run()
