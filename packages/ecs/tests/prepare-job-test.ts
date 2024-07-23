import * as fs from 'fs'
import * as path from 'path'
import { createContainerDefinition, prepareJob } from '../src/hooks/prepare-job'
import { JOB_CONTAINER_NAME } from '../src/hooks/constants'
import { mockClient } from 'aws-sdk-client-mock'
import { DescribeTasksCommand, ECSClient, ExecuteCommandCommand, RegisterTaskDefinitionCommand, RunTaskCommand, RunTaskCommandOutput, Session } from '@aws-sdk/client-ecs'
import { tmpdir } from 'os'
import { JobContainerInfo, PrepareJobArgs, ServiceContainerInfo } from 'hooklib/lib/interfaces'
import * as Utils from '../src/ecs/utils'

const ecsClientMock = mockClient(ECSClient);
beforeEach(() => {
  ecsClientMock.reset();
});

const prepareTaskMocks = (taskResponse: string, services?: ServiceContainerInfo[]) => {
  const prepareJobOutputFilePath = path.join(tmpdir(), 'responseFile');
    const taskDefinitionArn = 'arn:aws:ecs:us-east-1:012345678910:task-definition/hook-task';
    const taskArn = 'arn:aws:ecs:us-east-1:012345678910:task/1dc5c17a-422b-4dc4-b493-371970c6c4d6';
    const args: PrepareJobArgs = {
      container: {
        image: 'busybox',
        systemMountVolumes: [],
        workingDirectory: '/opt',
      }
    }

    ecsClientMock.on(RegisterTaskDefinitionCommand).resolves({
      taskDefinition: {
        taskDefinitionArn
      }
    })

    const runTaskResponse: RunTaskCommandOutput = {
      $metadata: {},
      tasks: [
        {
          taskArn
        }
      ]
    };

    runTaskResponse.tasks![0].containers = [
      {
        taskArn,
        name: JOB_CONTAINER_NAME,
        image: args.container?.image
      }
    ]
    services?.forEach(service => {
      runTaskResponse.tasks![0].containers?.push({
        taskArn,
        image: service.image,
        name: service.contextName
      })
    })
    ecsClientMock.on(RunTaskCommand, {
      taskDefinition: taskDefinitionArn
    }).resolves(runTaskResponse)

    ecsClientMock.on(DescribeTasksCommand).resolvesOnce({
      tasks: [
        {
          taskArn,
          lastStatus: 'RUNNING'
        }
      ]
    }).resolvesOnce({
      tasks: [
        {
          taskArn,
          lastStatus: 'STOPPED'
        }
      ]
    });

    ecsClientMock.on(ExecuteCommandCommand).resolves({

    })

    jest.spyOn(Utils, 'handleWebsocket').mockImplementation((session?: Session) => {
      return Promise.resolve(taskResponse)
    });

    fs.writeFileSync(prepareJobOutputFilePath, '');

    return {
      args,
      prepareJobOutputFilePath
    }
}
describe('Prepare job', () => {
  process.env.ACTIONS_RUNNER_POD_NAME = 'TEST-RUN'

  it('should not throw exception', async () => {
    const mocks = prepareTaskMocks('1');
    await expect(
      prepareJob(mocks.args, mocks.prepareJobOutputFilePath)
    ).resolves.not.toThrow()
  })

  it('should generate output file in JSON format', async () => {
    const mocks = prepareTaskMocks('1');
    await prepareJob(mocks.args, mocks.prepareJobOutputFilePath)
    const content = fs.readFileSync(mocks.prepareJobOutputFilePath)
    expect(() => JSON.parse(content.toString())).not.toThrow()
  })

  it('should not run prepare job without the job container', async () => {
    const mocks = prepareTaskMocks('1');
    mocks.args.container = undefined;
    await expect(
      prepareJob(mocks.args, mocks.prepareJobOutputFilePath)
    ).rejects.toThrow('Job Container is required.')
  })

  it('should not set entrypoint + command for service container if not passed in args', async () => {
    const service = createContainerDefinition({
      image: 'nginx',
      systemMountVolumes: [],
      workingDirectory: '/opt'
    }, Utils.generateContainerName('nginx'))
    
    expect(service.containerDefinition.entryPoint).toBe(undefined)
    expect(service.containerDefinition.command).toBe(undefined)
  })

  it('should determine alpine correctly', async () => {
    const mocks = prepareTaskMocks('0');
    await prepareJob(mocks.args, mocks.prepareJobOutputFilePath)
    const content = JSON.parse(
      fs.readFileSync(mocks.prepareJobOutputFilePath).toString()
    )
    expect(content.isAlpine).toBe(true)
  })

  test.each([undefined, null, []])(
    'should not throw exception when portMapping=%p',
    async pm => {
      
      const serviceContainerInfo: ServiceContainerInfo = {
        contextName: 'python',
        image: 'python',
        portMappings: (pm as any)
      }
      const mocks = prepareTaskMocks('1', [serviceContainerInfo])
      await prepareJob(mocks.args, mocks.prepareJobOutputFilePath)
      const content = JSON.parse(
        fs.readFileSync(mocks.prepareJobOutputFilePath).toString()
      )
      console.log(JSON.stringify(content));
      expect(() => content.context.services[0].image).not.toThrow()
    }
  )
})
