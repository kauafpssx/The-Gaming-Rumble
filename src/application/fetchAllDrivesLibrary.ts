import type { LibraryEntry } from "@/domain/library";
import { listDrives, reconcileLibrary } from "@/infrastructure/tauri/commands";

/**
 * Queries the installed-games library on every detected drive and merges the results.
 * Each drive is reconciled against disk first, so games left behind by a bug (or copied
 * in manually under `{drive}\Gaming Rumble\`) get auto-registered instead of staying orphaned.
 */
export async function fetchAllDrivesLibrary(): Promise<LibraryEntry[]> {
  const drives = await listDrives();
  const perDrive = await Promise.all(drives.map((drive) => reconcileLibrary(drive.name).catch(() => [])));
  return perDrive.flat();
}
