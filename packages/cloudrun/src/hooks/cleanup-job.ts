import { pruneTask } from "src/cloudrun";

export async function cleanupJob(): Promise<void> {
  await pruneTask()
}
