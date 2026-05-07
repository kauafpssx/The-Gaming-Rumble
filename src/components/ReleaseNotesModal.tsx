import { Fragment } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Icon } from "./Icon";

interface ReleaseNotesModalProps {
  open: boolean;
  version: string;
  markdown: string;
  onClose: () => void;
}

type MarkdownBlock =
  | { type: "hr"; text?: never }
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "bullet"; text: string }
  | { type: "paragraph"; text: string };

function parseMarkdown(markdown: string): MarkdownBlock[] {
  return markdown
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => {
      if (line.length > 0) return true;
      const prev = lines[index - 1]?.trim();
      const next = lines[index + 1]?.trim();
      return Boolean(prev && next);
    })
    .map<MarkdownBlock | null>((line) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      if (trimmed === "---") return { type: "hr" };
      if (trimmed.startsWith("# ")) return { type: "h1", text: trimmed.slice(2).trim() };
      if (trimmed.startsWith("## ")) return { type: "h2", text: trimmed.slice(3).trim() };
      if (trimmed.startsWith("- ")) return { type: "bullet", text: trimmed.slice(2).trim() };
      return { type: "paragraph", text: trimmed };
    })
    .filter((block): block is MarkdownBlock => block !== null);
}

function renderInline(text: string) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={index} className="rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[#a4e6ff]">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-black text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <a
          key={index}
          href={href}
          onClick={(event) => {
            event.preventDefault();
            openUrl(href).catch(() => {});
          }}
          className="cursor-pointer text-[#a4e6ff] underline decoration-white/10 underline-offset-4 hover:brightness-110"
        >
          {label}
        </a>
      );
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function ReleaseNotesModal({ open, version, markdown, onClose }: ReleaseNotesModalProps) {
  if (!open) return null;

  const blocks = parseMarkdown(markdown);

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-[#050507]/82 backdrop-blur-md px-4">
      <div className="w-[min(760px,100%)] max-h-[85vh] overflow-hidden rounded-[28px] border border-white/10 bg-[#101013] shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between gap-4 border-b border-white/6 px-6 py-5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.35em] text-[#a4e6ff] font-black">Change Log</p>
            <h2 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">Versão {version}</h2>
          </div>
          <button
            onClick={onClose}
            className="h-12 w-12 shrink-0 rounded-2xl border border-white/8 bg-white/[0.03] text-slate-400 transition-all hover:text-white hover:bg-white/[0.06]"
          >
            <span className="sr-only">Fechar changelog</span>
            <div className="flex items-center justify-center">
              <Icon name="close" size={20} />
            </div>
          </button>
        </div>

        <div className="custom-scrollbar max-h-[calc(85vh-88px)] overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-4 text-sm leading-7 text-slate-300">
            {blocks.map((block, index) => {
              if (block.type === "hr") return <div key={index} className="h-px w-full bg-white/6" />;

              if (block.type === "h1") {
                return (
                  <h1 key={index} className="text-3xl font-black tracking-tight text-white">
                    {renderInline(block.text)}
                  </h1>
                );
              }

              if (block.type === "h2") {
                return (
                  <h2 key={index} className="pt-2 text-lg font-black uppercase tracking-[0.08em] text-[#e5e1e4]">
                    {renderInline(block.text)}
                  </h2>
                );
              }

              if (block.type === "bullet") {
                return (
                  <div key={index} className="flex items-start gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a4e6ff]" />
                    <p>{renderInline(block.text)}</p>
                  </div>
                );
              }

              return (
                <p key={index} className="text-slate-400">
                  {renderInline(block.text)}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
