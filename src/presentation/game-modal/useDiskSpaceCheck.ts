import { useEffect, useMemo, useState } from "react";

import { getDiskSpace } from "@/infrastructure/tauri/commands";

function parseSizeToGB(sizeStr: string): number {
  const match = sizeStr.match(/([\d.]+)\s*(GB|MB|TB|B)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "TB") return val * 1024;
  if (unit === "GB") return val;
  if (unit === "MB") return val / 1024;
  return val / (1024 * 1024 * 1024);
}

function parseSizeGB(str: string): number {
  const match = str.match(/([\d.]+)\s*GB/i);
  return match ? parseFloat(match[1]) : 0;
}

/** Checks whether `path` has enough free space for `fileSize` (with a 35% safety margin for extraction). */
export function useDiskSpaceCheck(path: string, fileSize: string) {
  const [diskFree, setDiskFree] = useState("...");

  useEffect(() => {
    getDiskSpace(path).then(setDiskFree).catch(() => setDiskFree("N/A"));
  }, [path]);

  return useMemo(() => {
    const fileGB = parseSizeToGB(fileSize);
    const freeGB = parseSizeGB(diskFree);
    const required = fileGB * 1.35;
    return {
      diskFree,
      requiredGB: required,
      hasSpace: freeGB >= required,
      known: diskFree !== "..." && diskFree !== "N/A",
      shortfall: Math.max(0, required - freeGB),
    };
  }, [diskFree, fileSize]);
}
