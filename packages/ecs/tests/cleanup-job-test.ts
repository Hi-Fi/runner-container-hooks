import { cleanupJob } from '../src/hooks'
import { mockClient } from 'aws-sdk-client-mock'
import { DeleteTaskDefinitionsCommand, DeregisterTaskDefinitionCommand, DescribeTaskDefinitionCommand, ECSClient, ListTaskDefinitionsCommand, ListTasksCommand } from '@aws-sdk/client-ecs'

const mockEcsClient = mockClient(ECSClient)

beforeEach(() => {
  mockEcsClient.reset();
});

describe('Cleanup Job', () => {
  process.env.ACTIONS_RUNNER_POD_NAME = 'TEST-RUN'
  it('should not throw error when no tasks running', async () => {
    mockEcsClient.on(ListTaskDefinitionsCommand).resolves({
    })
    mockEcsClient.on(ListTasksCommand).resolves({
    })
    await expect(cleanupJob()).resolves.not.toThrow()
  })

  it('should not throw error when tasks still running without task definition', async () => {
    mockEcsClient.on(ListTaskDefinitionsCommand).resolves({
    })
    mockEcsClient.on(ListTasksCommand).resolves({
      taskArns: [
        'arn:aws:ecs:us-east-1:012345678910:task/1dc5c17a-422b-4dc4-b493-371970c6c4d6'
      ]
    })
    await expect(cleanupJob()).resolves.not.toThrow()
  })

  it('should not throw error when tasks still running with task definition', async () => {
    const testTaskDefinitionArn = 'arn:aws:ecs:us-east-1:012345678910:task-definition/hook-task'
    mockEcsClient.on(ListTaskDefinitionsCommand).resolves({
      taskDefinitionArns: [
        testTaskDefinitionArn
      ]
    })
    mockEcsClient.on(ListTasksCommand).resolves({
      taskArns: [
        'arn:aws:ecs:us-east-1:012345678910:task/1dc5c17a-422b-4dc4-b493-371970c6c4d6'
      ]
    })
    mockEcsClient.on(DescribeTaskDefinitionCommand, {
      taskDefinition: testTaskDefinitionArn,
      include: ['TAGS']
    }).resolves({
      tags: [
        {
          key: 'NOT_REMOVABLE',
          value: 'true'
        }
      ]
    })

    await expect(cleanupJob()).resolves.not.toThrow()
    expect(mockEcsClient.commandCalls(DeleteTaskDefinitionsCommand).length).toEqual(0)
    expect(mockEcsClient.commandCalls(DescribeTaskDefinitionCommand).length).toEqual(1)
  })

  it('should remove task definition with specific tag', async () => {
    const testId = 'test-id'
    process.env.GITHUB_RUN_ID = testId;
    const testTaskDefinitionArn = 'arn:aws:ecs:us-east-1:012345678910:task-definition/hook-task'
    const otherTaskDefinitionArn = 'arn:aws:ecs:us-east-1:012345678910:task-definition/other-task'
    mockEcsClient.on(ListTaskDefinitionsCommand).resolves({
      taskDefinitionArns: [
        testTaskDefinitionArn,
        otherTaskDefinitionArn
      ]
    })
    mockEcsClient.on(ListTasksCommand).resolves({
    })
    mockEcsClient.on(DescribeTaskDefinitionCommand, {
      taskDefinition: testTaskDefinitionArn,
      include: ['TAGS']
    }).resolves({
      tags: [
        {
          key: 'GITHUB_RUN_ID',
          value: testId
        }
      ]
    })
    mockEcsClient.on(DescribeTaskDefinitionCommand, {
      taskDefinition: otherTaskDefinitionArn,
      include: ['TAGS']
    }).resolves({
      tags: [
        {
          key: 'OTHER_TASK_DEFINITION',
          value: 'true'
        }
      ]
    })

    await expect(cleanupJob()).resolves.not.toThrow()
    expect(mockEcsClient.commandCalls(DescribeTaskDefinitionCommand).length).toEqual(2)
    expect(mockEcsClient.commandCalls(DeregisterTaskDefinitionCommand).length).toEqual(1)
    expect(mockEcsClient.commandCalls(DeleteTaskDefinitionsCommand).length).toEqual(1)
  });
})
