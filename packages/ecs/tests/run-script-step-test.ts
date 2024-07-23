import { runScriptStep } from '../src/hooks'
import * as exec from '../src/ecs/index'
import * as utils from '../src/ecs/utils'

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
})
