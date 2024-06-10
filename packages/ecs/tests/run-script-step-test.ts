import { cleanupJob, prepareJob, runScriptStep } from '../src/hooks'
import { TestHelper } from './test-setup'
import * as exec from '../src/ecs/index'
import * as utils from '../src/ecs/utils'
import { readFileSync } from 'fs';

jest.mock("fs", () => ({
  promises: {
    ...jest.requireActual("fs").promises,
  },
  constants: {
    ...jest.requireActual("fs").constanst
  },
  ...jest.requireActual("fs"),
  rmSync: jest.fn(),
}));

jest.useRealTimers()

let testHelper: TestHelper

let prepareJobOutputData: any

let runScriptStepDefinition

const spyExec = (returnCode: number) => {
  const response = `
First line
second line
SCRIPT_RUN_STATUS: ${returnCode}
`;
  jest.spyOn(exec, 'execTaskStep').mockResolvedValue(response);
  jest.spyOn(utils, 'writeEntryPointScript').mockReturnValue({
    containerPath: 'containerPath',
    runnerPath: 'runnerPath'
  })
}

afterEach(() => {
  jest.clearAllMocks()
})

describe('Run script step', () => {
  beforeEach(async () => {
    testHelper = new TestHelper()
    await testHelper.initialize()
    const prepareJobOutputFilePath = testHelper.createFile(
      'prepare-job-output.json'
    )

    const prepareJobData = testHelper.getPrepareJobDefinition()
    runScriptStepDefinition = testHelper.getRunScriptStepDefinition()

    await prepareJob(prepareJobData.args, prepareJobOutputFilePath)
    const outputContent = readFileSync(prepareJobOutputFilePath)
    prepareJobOutputData = JSON.parse(outputContent.toString())
  })

  afterEach(async () => {
    await cleanupJob()
    await testHelper.cleanup()
  })

  // NOTE: To use this test, do kubectl apply -f podspec.yaml (from podspec examples)
  // then change the name of the file to 'run-script-step-test.ts' and do
  // npm run test run-script-step

  it('should not throw an exception', async () => {
    spyExec(0);
    await expect(
      runScriptStep(
        {},
        { jobPod: 'test'},
        null
      )
    ).resolves.not.toThrow()
  })

  it('should throw an exception if command fails', async () => {
    spyExec(2);
    await expect(
      runScriptStep(
        {},
        { jobPod: 'test'},
        null
      )
    ).rejects.toThrow()
  })
  // it('should fail if the working directory does not exist', async () => {
  //   runScriptStepDefinition.args.workingDirectory = '/foo/bar'
  //   await expect(
  //     runScriptStep(
  //       runScriptStepDefinition.args,
  //       prepareJobOutputData.state,
  //       null
  //     )
  //   ).rejects.toThrow()
  // })

  // it('should shold have env variables available', async () => {
  //   runScriptStepDefinition.args.entryPoint = 'bash'

  //   runScriptStepDefinition.args.entryPointArgs = [
  //     '-c',
  //     "'if [[ -z $NODE_ENV ]]; then exit 1; fi'"
  //   ]
  //   await expect(
  //     runScriptStep(
  //       runScriptStepDefinition.args,
  //       prepareJobOutputData.state,
  //       null
  //     )
  //   ).resolves.not.toThrow()
  // })

  // it('Should have path variable changed in container with prepend path string', async () => {
  //   runScriptStepDefinition.args.prependPath = '/some/path'
  //   runScriptStepDefinition.args.entryPoint = '/bin/bash'
  //   runScriptStepDefinition.args.entryPointArgs = [
  //     '-c',
  //     `'if [[ ! $(env | grep "^PATH=") = "PATH=${runScriptStepDefinition.args.prependPath}:"* ]]; then exit 1; fi'`
  //   ]

  //   await expect(
  //     runScriptStep(
  //       runScriptStepDefinition.args,
  //       prepareJobOutputData.state,
  //       null
  //     )
  //   ).resolves.not.toThrow()
  // })

  // it('Dollar symbols in environment variables should not be expanded', async () => {
  //   runScriptStepDefinition.args.environmentVariables = {
  //     VARIABLE1: '$VAR',
  //     VARIABLE2: '${VAR}',
  //     VARIABLE3: '$(VAR)'
  //   }
  //   runScriptStepDefinition.args.entryPointArgs = [
  //     '-c',
  //     '\'if [[ -z "$VARIABLE1" ]]; then exit 1; fi\'',
  //     '\'if [[ -z "$VARIABLE2" ]]; then exit 2; fi\'',
  //     '\'if [[ -z "$VARIABLE3" ]]; then exit 3; fi\''
  //   ]

  //   await expect(
  //     runScriptStep(
  //       runScriptStepDefinition.args,
  //       prepareJobOutputData.state,
  //       null
  //     )
  //   ).resolves.not.toThrow()
  // })

  // it('Should have path variable changed in container with prepend path string array', async () => {
  //   runScriptStepDefinition.args.prependPath = ['/some/other/path']
  //   runScriptStepDefinition.args.entryPoint = '/bin/bash'
  //   runScriptStepDefinition.args.entryPointArgs = [
  //     '-c',
  //     `'if [[ ! $(env | grep "^PATH=") = "PATH=${runScriptStepDefinition.args.prependPath.join(
  //       ':'
  //     )}:"* ]]; then exit 1; fi'`
  //   ]

  //   await expect(
  //     runScriptStep(
  //       runScriptStepDefinition.args,
  //       prepareJobOutputData.state,
  //       null
  //     )
  //   ).resolves.not.toThrow()
  // })
})
