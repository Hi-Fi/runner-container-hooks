import { pruneTask, pruneTaskDefinitions } from '../ecs';

export async function cleanupJob(): Promise<void> {
  await Promise.all([pruneTask(), pruneTaskDefinitions()]
)}
