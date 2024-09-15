import { pruneTask } from "src/aca";

export async function cleanupJob(): Promise<void> {
  pruneTask()
}
