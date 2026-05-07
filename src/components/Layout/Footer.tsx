import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { Icon } from "../Icon";

interface FooterProps {
  installPath?: string;
  defaultDrive?: string;
  onVersionClick?: (version: string) => void;
  hasLastProtocol?: boolean;
  onLastProtocolClick?: () => void;
}

export function Footer({ installPath, defaultDrive, onVersionClick, hasLastProtocol = false, onLastProtocolClick }: FooterProps) {
  const [diskFree, setDiskFree] = useState("");
  const [drive, setDrive] = useState("");
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(v => setVersion(v)).catch(() => {});
  }, []);

  const targetPath = installPath || defaultDrive || "";

  useEffect(() => {
    if (targetPath) {
      const letter = targetPath.split('\\')[0] || targetPath;
      setDrive(letter);
      invoke<string>("get_disk_space", { path: targetPath.includes(':') ? targetPath.split('\\')[0] + '\\' : targetPath })
        .then(r => setDiskFree(r !== "N/A" ? r : ""))
        .catch(() => {});
    } else {
      setDrive("");
      setDiskFree("");
    }
  }, [targetPath]);

  return (
    <footer className="h-10 px-8 border-t border-white/5 bg-[#131315]/70 flex items-center justify-between text-[9px] uppercase font-black opacity-50 tracking-[0.6em] z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          title="Reabrir último jogo recebido pelo protocolo"
          onClick={() => onLastProtocolClick?.()}
          disabled={!hasLastProtocol}
          className="cursor-pointer text-slate-500 transition-colors hover:text-[#a4e6ff] disabled:cursor-default disabled:opacity-30"
        >
          <Icon name="history" size={14} />
        </button>
        <span>{drive}{diskFree ? ` ${diskFree} livre` : ""}</span>
      </div>
      <button
        type="button"
        onClick={() => version && onVersionClick?.(version)}
        disabled={!version}
        className="cursor-pointer transition-colors hover:text-[#a4e6ff] disabled:cursor-default"
      >
        {version ? `v${version}` : ""}
      </button>
    </footer>
  );
}
