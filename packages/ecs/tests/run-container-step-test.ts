import { RunContainerStepArgs } from 'hooklib/lib/interfaces'
import { runContainerStep } from '../src/hooks'
import { mockClient } from 'aws-sdk-client-mock'
import { DescribeTasksCommand, ECSClient, ListTasksCommand, RegisterTaskDefinitionCommand, RunTaskCommand } from '@aws-sdk/client-ecs'

const mockEcsClient = mockClient(ECSClient)

const runContainerStepData: RunContainerStepArgs = {
  systemMountVolumes: [],
  workingDirectory: '/opt/runner/',
}

beforeEach(() => {
  mockEcsClient.reset();
});

describe('Run container step', () => {
  process.env.GITHUB_WORKSPACE = '/_work'
  process.env.ACTIONS_RUNNER_POD_NAME = 'TEST-RUN';
  process.env.ACTIONS_RUNNER_PREPARE_JOB_TIMEOUT_SECONDS = '2';

  it('should not throw', async () => {
    const taskArn = 'arn:aws:ecs:us-east-1:012345678910:task/1dc5c17a-422b-4dc4-b493-371970c6c4d6';
    mockEcsClient.on(RegisterTaskDefinitionCommand).resolves({
      taskDefinition: {
        taskDefinitionArn: 'arn:aws:ecs:us-east-1:012345678910:task-definition/hook-task'
      }
    })
    mockEcsClient.on(RunTaskCommand).resolves({
      tasks: [
        {
          taskArn
        }
      ]
    })

    mockEcsClient.on(ListTasksCommand).resolves({
      taskArns: [
        taskArn
      ]
    })
    mockEcsClient.on(DescribeTasksCommand).resolvesOnce({
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
    }).resolvesOnce({
      tasks: [
        {
          stopCode: 'EssentialContainerExited',
          stoppedReason: 'Success'
        }
      ]
    })

    const exitCode = await runContainerStep(runContainerStepData)
    expect(exitCode).toBe(0)
  })

  it('should throw error on failure', async () => {
    const taskArn = 'arn:aws:ecs:us-east-1:012345678910:task/1dc5c17a-422b-4dc4-b493-371970c6c4d6';
    mockEcsClient.on(RegisterTaskDefinitionCommand).resolves({
      taskDefinition: {
        taskDefinitionArn: 'arn:aws:ecs:us-east-1:012345678910:task-definition/hook-task'
      }
    })
    mockEcsClient.on(RunTaskCommand).resolves({
      tasks: [
        {
          taskArn
        }
      ]
    })

    mockEcsClient.on(ListTasksCommand).resolves({
      taskArns: [
        taskArn
      ]
    })
    mockEcsClient.on(DescribeTasksCommand).resolvesOnce({
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
    }).resolvesOnce({
      tasks: [
        {
          stopCode: 'EssentialContainerExited',
          stoppedReason: 'Error: things failed'
        }
      ]
    })

    expect(runContainerStep(runContainerStepData)).rejects.toThrow('things failed')
  })
})
