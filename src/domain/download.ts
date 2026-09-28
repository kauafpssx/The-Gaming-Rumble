import type { GamePayload } from "./game";

/** Um arquivo a baixar via HTTP direto (ex.: Pixeldrain) — espelha HttpDownloadFile no Rust. */
export interface HttpDownloadFile {
  url: string;
  fileName: string;
}

/** Estado de download/extração em andamento */
export interface DownloadState {
  payload: GamePayload;
  installPath: string;
  fixFilePath?: string;
  /** Qual motor está tocando este download — torrent (padrão) ou HTTP direto (ex.: Pixeldrain). */
  engine: "torrent" | "http";
  /** Arquivo(s) usados pelo motor HTTP — necessário pra retomar/pausar (jogo + fix, ou só o fix). */
  httpFiles?: HttpDownloadFile[];
  phase: "downloading" | "extracting" | "applying_fix" | "done" | "error";
  currentPart: number;
  totalParts: number;
  progressPercent: number;
  extractionPartPercent?: number;
  speedMBs: number;
  eta: string;
  elapsedTime: string;
  logs: LogEntry[];
  isPaused: boolean;
  peers: number;
  seeds: number;
  fixOnly: boolean;
  errorMessage?: string;
}

export interface LogEntry {
  time: string;
  tag: "INFO" | "SUCCESS" | "EXTRACTING" | "CLEANING" | "ERROR" | "FIX" | "WARNING";
  msg: string;
}
