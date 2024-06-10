import { pruneTask, pruneTaskDefinitions } from "src/ecs";

export async function cleanupJob(): Promise<void> {
  await Promise.all([pruneTask(), pruneTaskDefinitions()]
)}
