import * as fs from 'fs'
import { Mount } from 'hooklib'
import * as path from 'path'
import { v1 as uuidv4 } from 'uuid'
import { POD_VOLUME_NAME, Volume } from './index'
import * as shlex from 'shlex'
import { MountPoint } from '@aws-sdk/client-ecs'
import util from "util";
import { createHash } from 'crypto'

// Mounted directory in job containers
export const DEFAULT_CONTAINER_ENTRY_POINT = '/__e/executor'

export const ENV_HOOK_TEMPLATE_PATH = 'ACTIONS_RUNNER_CONTAINER_HOOK_TEMPLATE'
export const ENV_USE_KUBE_SCHEDULER = 'ACTIONS_RUNNER_USE_KUBE_SCHEDULER'

const termOptions = {
  rows: 34,
  cols: 197,
};
const textDecoder = new util.TextDecoder();

export interface VolumeMountSettings {
  mountPoints: MountPoint[]
  volumes: Volume[]
}
// TODO: Have to insert volume for each subpath or do ln commands. Still would need list of paths
export function containerVolumes(
  userMountVolumes: Mount[] = [],
  jobContainer = true,
  containerAction = false
): VolumeMountSettings {
  const mounts: MountPoint[] = [
    {
      sourceVolume: POD_VOLUME_NAME,
      containerPath: '/__w'
    }
  ]

  const volumes: Volume[] = [
    {
      name: POD_VOLUME_NAME,
    }
  ]

  const workspacePath = process.env.GITHUB_WORKSPACE as string
  if (containerAction) {
    const i = workspacePath.lastIndexOf('_work/')
    const workspaceRelativePath = workspacePath.slice(i + '_work/'.length)
    mounts.push(
      {
        sourceVolume: createHash('sha1').update(POD_VOLUME_NAME + workspaceRelativePath).digest('hex'),
        containerPath: '/github/workspace',
      },
      {
        sourceVolume: createHash('sha1').update(POD_VOLUME_NAME + '_temp/_runner_file_commands').digest('hex'),
        containerPath: '/github/file_commands',
      },
      {
        sourceVolume: createHash('sha1').update(POD_VOLUME_NAME + '_temp/_github_workflow').digest('hex'),
        containerPath: '/github/workflow',
      }
    )
    volumes.push(
      {
        name: createHash('sha1').update(POD_VOLUME_NAME + workspaceRelativePath).digest('hex'),
        rootDirectory: workspaceRelativePath,
      },
      {
        name: createHash('sha1').update(POD_VOLUME_NAME + '_temp/_runner_file_commands').digest('hex'),
        rootDirectory: '_temp/_runner_file_commands',
      },
      {
        name: createHash('sha1').update(POD_VOLUME_NAME + '_temp/_github_workflow').digest('hex'),
        rootDirectory: '_temp/_github_workflow',
      }
    )
    return {
      mountPoints: mounts,
      volumes
    }
  }

  if (!jobContainer) {
    return {
      mountPoints: mounts,
      volumes
    }
  }

  mounts.push(
    {
      sourceVolume: 'externals',
      containerPath: '/__e',
    },
    {
      sourceVolume: createHash('sha1').update(POD_VOLUME_NAME + '_temp/_github_home').digest('hex'),
      containerPath: '/github/home',
    },
    {
      sourceVolume: createHash('sha1').update(POD_VOLUME_NAME + '_temp/_github_workflow').digest('hex'),
      containerPath: '/github/workflow',
    }
  )

  volumes.push(
    {
      name: 'externals',
      rootDirectory: '/',
      fileSystemId: process.env.EXTERNALS_EFS_ID
    },
    {
      name: createHash('sha1').update(POD_VOLUME_NAME + '_temp/_github_home').digest('hex'),
      rootDirectory: '_temp/_github_home',
    },
    {
      name: createHash('sha1').update(POD_VOLUME_NAME + '_temp/_github_workflow').digest('hex'),
      rootDirectory: '_temp/_github_workflow',
    }
  )


  if (!userMountVolumes?.length) {
    return {
      mountPoints: mounts,
      volumes
    }
  }

  for (const userVolume of userMountVolumes) {
    let sourceVolumePath = ''
    if (path.isAbsolute(userVolume.sourceVolumePath)) {
      if (!userVolume.sourceVolumePath.startsWith(workspacePath)) {
        throw new Error(
          'Volume mounts outside of the work folder are not supported'
        )
      }
      // source volume path should be relative path
      sourceVolumePath = userVolume.sourceVolumePath.slice(
        workspacePath.length + 1
      )
    } else {
      sourceVolumePath = userVolume.sourceVolumePath
    }

    mounts.push({
      sourceVolume: createHash('sha1').update(POD_VOLUME_NAME + sourceVolumePath).digest('hex'),
      containerPath: userVolume.targetVolumePath,
      readOnly: userVolume.readOnly
    })

    volumes.push({
      name: createHash('sha1').update(POD_VOLUME_NAME + sourceVolumePath).digest('hex'),
      rootDirectory: sourceVolumePath
    })
  }

  return {
    mountPoints: mounts,
    volumes
  }
}

export function writeEntryPointScript(
  workingDirectory: string,
  entryPoint: string,
  entryPointArgs?: string[],
  prependPath?: string[],
  environmentVariables?: { [key: string]: string }
): { containerPath: string; runnerPath: string, jobId: string } {
  let exportPath = ''
  if (prependPath?.length) {
    // TODO: remove compatibility with typeof prependPath === 'string' as we bump to next major version, the hooks will lose PrependPath compat with runners 2.293.0 and older
    const prepend =
      typeof prependPath === 'string' ? prependPath : prependPath.join(':')
    exportPath = `export PATH=${prepend}:$PATH`
  }
  let environmentPrefix = ''

  if (environmentVariables && Object.entries(environmentVariables).length) {
    const envBuffer: string[] = []
    for (const [key, value] of Object.entries(environmentVariables)) {
      if (
        key.includes(`=`) ||
        key.includes(`'`) ||
        key.includes(`"`) ||
        key.includes(`$`)
      ) {
        throw new Error(
          `environment key ${key} is invalid - the key must not contain =, $, ', or "`
        )
      }
      envBuffer.push(
        `"${key}=${value
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\$/g, '\\$')
          .replace(/`/g, '\\`')}"`
      )
    }
    environmentPrefix = `env ${envBuffer.join(' ')} `
  }

  const content = `#!/bin/sh -l
${exportPath}
cd ${workingDirectory} && \
exec ${environmentPrefix} ${entryPoint} ${entryPointArgs?.length ? entryPointArgs.join(' ') : ''
    }
`
  const jobId: string = uuidv4();
  const filename = `${jobId}.sh`
  const entryPointPath = `${process.env.RUNNER_TEMP}/${filename}`
  fs.writeFileSync(entryPointPath, content)
  return {
    containerPath: `/__w/_temp/${filename}`,
    runnerPath: entryPointPath,
    jobId
  }
}

export function generateContainerName(image: string): string {
  const nameWithTag = image.split('/').pop()
  const name = nameWithTag?.split(':').at(0)

  if (!name) {
    throw new Error(`Image definition '${image}' is invalid`)
  }

  return name
}


export enum PodPhase {
  PENDING = 'Pending',
  RUNNING = 'Running',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  UNKNOWN = 'Unknown',
  COMPLETED = 'Completed'
}

export function fixArgs(args: string[]): string[] {
  return shlex.split(args.join(' '))
}
