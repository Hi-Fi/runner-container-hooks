
import { Mount } from 'hooklib'
import { v1 as uuidv4 } from 'uuid'
import { BINARIES_VOLUME_NAME, EXTERNALS_VOLUME_NAME, GITHUB_VOLUME_NAME, POD_VOLUME_NAME } from './index'
import { networkInterfaces } from 'os'
import { type google } from '@google-cloud/run/build/protos/protos'
import { split } from 'shlex'
import { isAbsolute } from 'path'
import { writeFileSync } from 'fs'


// Mounted directory in job containers
export const DEFAULT_CONTAINER_ENTRY_POINT = '/__e/executor'

export const ENV_HOOK_TEMPLATE_PATH = 'ACTIONS_RUNNER_CONTAINER_HOOK_TEMPLATE'
export const ENV_USE_KUBE_SCHEDULER = 'ACTIONS_RUNNER_USE_KUBE_SCHEDULER'

export function getIpAddress() {
  const nics = networkInterfaces();
  const ipAddresses: string[] = [];
  Object.entries(nics).forEach( ([_nicName, nicInfo]) => {
    nicInfo?.forEach( net => {
      // We're interested only on IPv4 addresses, that are not 169.254 "incorrect" IP
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith("169.254")) {
        ipAddresses.push(net.address);
      }
    })
  })

  console.log(`Job has following IP address(es): ${ipAddresses.join(', ')}`);
  return ipAddresses;
}

// TODO: Have to insert volume for each subpath or do ln commands. Still would need list of paths
export function containerVolumes(
  userMountVolumes: Mount[] = [],
  jobContainer = true,
  containerAction = false
): google.cloud.run.v2.IVolume[] {

  // This is set by runner start script so should be always present.
  const executionId = process.env.EXECID ?? '';
  const mounts: google.cloud.run.v2.IVolumeMount[] = [
    {
      name: POD_VOLUME_NAME,
      mountPath: '/__w',
    },
    {
      name: GITHUB_VOLUME_NAME,
      mountPath: '/github'
    }
  ]

  const workspacePath = process.env.GITHUB_WORKSPACE as string
  if (containerAction) {
    // const i = workspacePath.lastIndexOf('_work/')
    // const workspaceRelativePath = workspacePath.slice(i + '_work/'.length)
    // mounts.push(
    //   {
    //     name: POD_VOLUME_NAME,
    //     mountPath: '/github/workspace',
    //   },
    //   // These are not working, has to consider how mapping could be done as it can't refer to path in GCS or ave subPath support.
    //   {
    //     name: POD_VOLUME_NAME,
    //     mountPath: '/github/file_commands',
    //   },
    //   {
    //     name: POD_VOLUME_NAME,
    //     mountPath: '/github/workflow',
    //   }
    // )
    return mounts
  }

  if (!jobContainer) {
    return mounts
  }

  mounts.push(
    {
      name: EXTERNALS_VOLUME_NAME,
      mountPath: '/__e',
    },
    {
      name: BINARIES_VOLUME_NAME,
      mountPath: '/__b',
    },
    // These are not working, has to consider how mapping could be done as it can't refer to path in GCS or ave subPath support.
    // {
    //   name: POD_VOLUME_NAME,
    //   mountPath: '/github/home',
    // },
    // {
    //   name: POD_VOLUME_NAME,
    //   mountPath: '/github/workflow',
    // }
  )

  if (!userMountVolumes?.length) {
    return mounts
  }

  for (const userVolume of userMountVolumes) {
    let sourceVolumePath = ''
    if (isAbsolute(userVolume.sourceVolumePath)) {
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
      name: POD_VOLUME_NAME,
      mountPath: userVolume.targetVolumePath,
    })
  }

  return mounts
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
  writeFileSync(entryPointPath, content)
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

// Overwrite or append based on container options
//
// Keep in mind, envs and volumes could be passed as fields in container definition
// so default volume mounts and envs are appended first, and then create options are used
// to append more values
//
// Rest of the fields are just applied
// For example, container.createOptions.container.image is going to overwrite container.image field
// export function mergeContainerWithOptions(
//   base: k8s.V1Container,
//   from: k8s.V1Container
// ): void {
//   for (const [key, value] of Object.entries(from)) {
//     if (key === 'name') {
//       if (value !== CONTAINER_EXTENSION_PREFIX + base.name) {
//         core.warning("Skipping name override: name can't be overwritten")
//       }
//       continue
//     } else if (key === 'image') {
//       core.warning("Skipping image override: image can't be overwritten")
//       continue
//     } else if (key === 'env') {
//       const envs = value as k8s.V1EnvVar[]
//       base.env = mergeLists(base.env, envs)
//     } else if (key === 'volumeMounts' && value) {
//       const volumeMounts = value as k8s.V1VolumeMount[]
//       base.volumeMounts = mergeLists(base.volumeMounts, volumeMounts)
//     } else if (key === 'ports' && value) {
//       const ports = value as k8s.V1ContainerPort[]
//       base.ports = mergeLists(base.ports, ports)
//     } else {
//       base[key] = value
//     }
//   }
// }

// export function mergePodSpecWithOptions(
//   base: k8s.V1PodSpec,
//   from: k8s.V1PodSpec
// ): void {
//   for (const [key, value] of Object.entries(from)) {
//     if (key === 'containers') {
//       base.containers.push(
//         ...from.containers.filter(
//           e => !e.name?.startsWith(CONTAINER_EXTENSION_PREFIX)
//         )
//       )
//     } else if (key === 'volumes' && value) {
//       const volumes = value as k8s.V1Volume[]
//       base.volumes = mergeLists(base.volumes, volumes)
//     } else {
//       base[key] = value
//     }
//   }
// }

// export function mergeObjectMeta(
//   base: { metadata?: k8s.V1ObjectMeta },
//   from: k8s.V1ObjectMeta
// ): void {
//   if (!base.metadata?.labels || !base.metadata?.annotations) {
//     throw new Error(
//       "Can't merge metadata: base.metadata or base.annotations field is undefined"
//     )
//   }
//   if (from?.labels) {
//     for (const [key, value] of Object.entries(from.labels)) {
//       if (base.metadata?.labels?.[key]) {
//         core.warning(`Label ${key} is already defined and will be overwritten`)
//       }
//       base.metadata.labels[key] = value
//     }
//   }

//   if (from?.annotations) {
//     for (const [key, value] of Object.entries(from.annotations)) {
//       if (base.metadata?.annotations?.[key]) {
//         core.warning(
//           `Annotation ${key} is already defined and will be overwritten`
//         )
//       }
//       base.metadata.annotations[key] = value
//     }
//   }
// }

// export function readExtensionFromFile(): k8s.V1PodTemplateSpec | undefined {
//   const filePath = process.env[ENV_HOOK_TEMPLATE_PATH]
//   if (!filePath) {
//     return undefined
//   }
//   const doc = yaml.load(fs.readFileSync(filePath, 'utf8'))
//   if (!doc || typeof doc !== 'object') {
//     throw new Error(`Failed to parse ${filePath}`)
//   }
//   return doc as k8s.V1PodTemplateSpec
// }

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

// function mergeLists<T>(base?: T[], from?: T[]): T[] {
//   const b: T[] = base || []
//   if (!from?.length) {
//     return b
//   }
//   b.push(...from)
//   return b
// }

export function fixArgs(args: string[]): string[] {
  return split((args ?? []).join(' '))
}
