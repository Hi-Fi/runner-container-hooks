import { pruneTask } from "src/aca";

export async function cleanupJob(): Promise<void> {
  await pruneTask()
}
