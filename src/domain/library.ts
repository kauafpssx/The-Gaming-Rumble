export interface LibraryEntry {
  title: string;
  install_path: string;
  executable: string;
  banner: string;
  size_gb: number;
  play_time_ms: number;
}

export interface LibraryEntryUpdatedEvent {
  drive: string;
  entry: LibraryEntry;
}

/** Drive letter (e.g. "D:\\") a library entry lives on, derived from its install path. */
export function driveOfPath(installPath: string): string {
  const segment = installPath.split("\\")[0] ?? "";
  return segment.endsWith(":") ? `${segment}\\` : segment;
}
