import * as k8s from '@kubernetes/client-node'
import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as core from '@actions/core'
import { Mount } from 'hooklib'
import * as path from 'path'
import { v1 as uuidv4 } from 'uuid'
import { POD_VOLUME_NAME, Volume } from './index'
import { CONTAINER_EXTENSION_PREFIX } from '../hooks/constants'
import * as shlex from 'shlex'
import { MountPoint, Session } from '@aws-sdk/client-ecs'
import { join } from 'path'
import { WebSocket } from 'ws'
import { ssm } from "ssm-session";
import util from "util";
import { createHash } from 'crypto'

export const DEFAULT_CONTAINER_ENTRY_POINT_ARGS = [`-f`, `/dev/null`]
export const DEFAULT_CONTAINER_ENTRY_POINT = 'tail'

export const ENV_HOOK_TEMPLATE_PATH = 'ACTIONS_RUNNER_CONTAINER_HOOK_TEMPLATE'
export const ENV_USE_KUBE_SCHEDULER = 'ACTIONS_RUNNER_USE_KUBE_SCHEDULER'

const termOptions = {
  rows: 34,
  cols: 197,
};
const textDecoder = new util.TextDecoder();

async function waitForClosery(wsConnection: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    const listener = () => {
      wsConnection.removeListener('close', listener);
      resolve();
    }
    wsConnection.addListener('close', listener)
  })
}

export async function handleWebsocket(session?: Session): Promise<string> {
  let log;
  if (session && session.streamUrl) {

    const wsConnection = new WebSocket(session.streamUrl);
    wsConnection.on('error', console.error);
    wsConnection.on('message', (data, _) => {
      var agentMessage = ssm.decode(data);
      ssm.sendACK(wsConnection, agentMessage);
      if (agentMessage.payloadType === 1) {
        log = textDecoder.decode(agentMessage.payload)
      } else if (agentMessage.payloadType === 17) {
        ssm.sendInitMessage(wsConnection, termOptions);
      }
    })

    wsConnection.on('open', () => {
      ssm.init(wsConnection, {
        token: session.tokenValue,
        termOptions: termOptions,
      });
    })
    await waitForClosery(wsConnection);
    return log;
  } else {
    return ""
  }
}

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
      sourceVolume: createHash('sha1').update(POD_VOLUME_NAME + 'externals').digest('hex'),
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
      name: createHash('sha1').update(POD_VOLUME_NAME + 'externals').digest('hex'),
      rootDirectory: 'externals',
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
): { containerPath: string; runnerPath: string } {
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

  // As ECS doesn't return/handle script status with exec command, printing that to output for parsing
  const content = `#!/bin/sh -l
set -e
finally() {
  local exit_code="\${1:-0}"

  echo "SCRIPT_RUN_STATUS: \${exit_code}"
  exit "\${exit_code}"
}
trap 'finally $?' EXIT
${exportPath}
cd ${workingDirectory} && \
exec ${environmentPrefix} ${entryPoint} ${entryPointArgs?.length ? entryPointArgs.join(' ') : ''
    }
`
  const filename = `${uuidv4()}.sh`
  const entryPointPath = `${process.env.RUNNER_TEMP}/${filename}`
  fs.writeFileSync(entryPointPath, content)
  return {
    containerPath: `/__w/_temp/${filename}`,
    runnerPath: entryPointPath
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

// Overwrite or append based on container options
//
// Keep in mind, envs and volumes could be passed as fields in container definition
// so default volume mounts and envs are appended first, and then create options are used
// to append more values
//
// Rest of the fields are just applied
// For example, container.createOptions.container.image is going to overwrite container.image field
export function mergeContainerWithOptions(
  base: k8s.V1Container,
  from: k8s.V1Container
): void {
  for (const [key, value] of Object.entries(from)) {
    if (key === 'name') {
      if (value !== CONTAINER_EXTENSION_PREFIX + base.name) {
        core.warning("Skipping name override: name can't be overwritten")
      }
      continue
    } else if (key === 'image') {
      core.warning("Skipping image override: image can't be overwritten")
      continue
    } else if (key === 'env') {
      const envs = value as k8s.V1EnvVar[]
      base.env = mergeLists(base.env, envs)
    } else if (key === 'volumeMounts' && value) {
      const volumeMounts = value as k8s.V1VolumeMount[]
      base.volumeMounts = mergeLists(base.volumeMounts, volumeMounts)
    } else if (key === 'ports' && value) {
      const ports = value as k8s.V1ContainerPort[]
      base.ports = mergeLists(base.ports, ports)
    } else {
      base[key] = value
    }
  }
}

export function mergePodSpecWithOptions(
  base: k8s.V1PodSpec,
  from: k8s.V1PodSpec
): void {
  for (const [key, value] of Object.entries(from)) {
    if (key === 'containers') {
      base.containers.push(
        ...from.containers.filter(
          e => !e.name?.startsWith(CONTAINER_EXTENSION_PREFIX)
        )
      )
    } else if (key === 'volumes' && value) {
      const volumes = value as k8s.V1Volume[]
      base.volumes = mergeLists(base.volumes, volumes)
    } else {
      base[key] = value
    }
  }
}

export function mergeObjectMeta(
  base: { metadata?: k8s.V1ObjectMeta },
  from: k8s.V1ObjectMeta
): void {
  if (!base.metadata?.labels || !base.metadata?.annotations) {
    throw new Error(
      "Can't merge metadata: base.metadata or base.annotations field is undefined"
    )
  }
  if (from?.labels) {
    for (const [key, value] of Object.entries(from.labels)) {
      if (base.metadata?.labels?.[key]) {
        core.warning(`Label ${key} is already defined and will be overwritten`)
      }
      base.metadata.labels[key] = value
    }
  }

  if (from?.annotations) {
    for (const [key, value] of Object.entries(from.annotations)) {
      if (base.metadata?.annotations?.[key]) {
        core.warning(
          `Annotation ${key} is already defined and will be overwritten`
        )
      }
      base.metadata.annotations[key] = value
    }
  }
}

export function readExtensionFromFile(): k8s.V1PodTemplateSpec | undefined {
  const filePath = process.env[ENV_HOOK_TEMPLATE_PATH]
  if (!filePath) {
    return undefined
  }
  const doc = yaml.load(fs.readFileSync(filePath, 'utf8'))
  if (!doc || typeof doc !== 'object') {
    throw new Error(`Failed to parse ${filePath}`)
  }
  return doc as k8s.V1PodTemplateSpec
}

export function useKubeScheduler(): boolean {
  return process.env[ENV_USE_KUBE_SCHEDULER] === 'true'
}

export enum PodPhase {
  PENDING = 'Pending',
  RUNNING = 'Running',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  UNKNOWN = 'Unknown',
  COMPLETED = 'Completed'
}

function mergeLists<T>(base?: T[], from?: T[]): T[] {
  const b: T[] = base || []
  if (!from?.length) {
    return b
  }
  b.push(...from)
  return b
}

export function fixArgs(args: string[]): string[] {
  return shlex.split(args.join(' '))
}
