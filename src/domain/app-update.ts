export type AppUpdateStage = "idle" | "available" | "downloading" | "installing" | "error";

export interface AppUpdateModalState {
  visible: boolean;
  configured: boolean;
  stage: AppUpdateStage;
  currentVersion: string;
  nextVersion: string;
  notes: string;
  progressPercent: number;
  downloadedBytes: number;
  totalBytes: number | null;
  errorMessage: string;
}

export interface UpdateCheckResponse {
  configured: boolean;
  available: boolean;
  currentVersion: string;
  version?: string | null;
  notes?: string | null;
  pubDate?: string | null;
  error?: string | null;
}

export type AppUpdateEvent =
  | { event: "Started"; data: { contentLength?: number | null; version: string } }
  | { event: "Progress"; data: { downloaded: number; chunkLength: number; contentLength?: number | null } }
  | { event: "FinishedDownload" }
  | { event: "Installing" }
  | { event: "Failed"; data: { message: string } };
