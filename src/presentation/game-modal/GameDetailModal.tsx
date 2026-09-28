import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Download,
  Folder,
  Gamepad2,
  HardDrive,
  Magnet,
  Play,
  Rocket,
  Shield,
  Tag,
  Trophy,
  Wrench,
  Zap,
} from "lucide-react";

import { useDrives } from "@/application/useDrives";
import type { InstallableGame } from "@/domain/game";
import { isCatalogEntry, sanitizeFolderName } from "@/domain/game";
import { getGameDate } from "@/domain/catalog-sort";
import type { HttpDownloadFile } from "@/domain/download";
import { getPixeldrainFixOnly, getPixeldrainFullDownload } from "@/domain/hoster";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";

import { GameDetailInfo } from "./GameDetailInfo";
import { useDiskSpaceCheck } from "./useDiskSpaceCheck";

interface GameDetailModalProps {
  game: InstallableGame | null;
  defaultDrive: string;
  installed: boolean;
  onClose: () => void;
  onStart: (installPath: string) => void;
  onDownloadFixOnly: (installPath: string) => void;
  onDownloadHttp: (installPath: string, files: HttpDownloadFile[]) => void;
  onDownloadFixOnlyHttp: (installPath: string, url: string, fileName: string) => void;
  onPlayInstalled: () => void;
}

export function GameDetailModal({
  game,
  defaultDrive,
  installed,
  onClose,
  onStart,
  onDownloadFixOnly,
  onDownloadHttp,
  onDownloadFixOnlyHttp,
  onPlayInstalled,
}: GameDetailModalProps) {
  const [selectedDrive, setSelectedDrive] = useState(defaultDrive);
  const { drives } = useDrives();

  useEffect(() => {
    if (game) setSelectedDrive(defaultDrive);
  }, [game, defaultDrive]);

  const path = game ? `${selectedDrive}Gaming Rumble\\${sanitizeFolderName(game.title)}` : "";
  const { requiredGB, hasSpace, known, shortfall } = useDiskSpaceCheck(path, game?.fileSize ?? "0 GB");

  const catalog = game && isCatalogEntry(game) ? game : null;

  /**
   * Pixeldrain tem API direta e gratuita — quando disponível, vira a opção padrão em vez
   * do torrent. Só conta como disponível se tiver TUDO que o jogo precisa (jogo + fix,
   * quando o fix é obrigatório) — faltando uma peça, cai pro torrent em vez de gerar uma
   * instalação incompleta.
   */
  const pixeldrainOption = useMemo(() => (catalog ? getPixeldrainFullDownload(catalog) : null), [catalog]);
  const pixeldrainFixOption = useMemo(() => (catalog ? getPixeldrainFixOnly(catalog) : null), [catalog]);

  const [downloadSource, setDownloadSource] = useState<"pixeldrain" | "torrent">("torrent");
  useEffect(() => {
    setDownloadSource(pixeldrainOption ? "pixeldrain" : "torrent");
  }, [pixeldrainOption]);

  function handleDownload() {
    if (!hasSpace) return;
    if (downloadSource === "pixeldrain" && pixeldrainOption) {
      onDownloadHttp(path, pixeldrainOption);
    } else {
      onStart(path);
    }
  }

  /** Fix isolado: se o Pixeldrain tiver o fix, baixa direto por HTTP em vez de ir pro torrent. */
  function handleDownloadFixOnly() {
    if (!hasSpace) return;
    if (pixeldrainFixOption) {
      onDownloadFixOnlyHttp(path, pixeldrainFixOption.url, pixeldrainFixOption.fileName);
    } else {
      onDownloadFixOnly(path);
    }
  }

  if (!game) return null;
  const gameDate = catalog ? getGameDate(catalog) : null;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[min(720px,92vw)] max-h-[88vh] p-0 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          <div className="relative h-48 w-full overflow-hidden shrink-0">
            <img src={catalog?.background || game.banner} alt={game.title} className="h-full w-full object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
          </div>

          <div className="p-6 pt-0 -mt-10 relative space-y-5">
            <h2 className="text-2xl font-black tracking-tight text-white">{game.title}</h2>

            <div className="flex flex-wrap gap-2">
              {gameDate && <Chip icon={<Calendar className="w-3.5 h-3.5" />}>{gameDate}</Chip>}
              <Chip icon={<HardDrive className="w-3.5 h-3.5" />}>{game.fileSize}</Chip>
              <Chip icon={<Folder className="w-3.5 h-3.5" />}>
                {game.parts} arquivo{game.parts !== 1 ? "s" : ""}
              </Chip>
              {catalog?.priceBrl && (
                <Chip icon={<Tag className="w-3.5 h-3.5" />} highlight>
                  {catalog.isFree ? "Grátis" : catalog.priceBrl}
                </Chip>
              )}
              {catalog?.controllerSupport && (
                <Chip icon={<Gamepad2 className="w-3.5 h-3.5" />}>Controle {catalog.controllerSupport === "full" ? "total" : "parcial"}</Chip>
              )}
              {catalog?.releaseDateSteam && <Chip icon={<Rocket className="w-3.5 h-3.5" />}>Lançamento: {catalog.releaseDateSteam}</Chip>}
              {!!catalog?.achievementsTotal && (
                <Chip icon={<Trophy className="w-3.5 h-3.5" />}>
                  {catalog.achievementsTotal} conquista{catalog.achievementsTotal !== 1 ? "s" : ""}
                </Chip>
              )}
              {(catalog?.ratingsPegi || catalog?.ratingsEsrb) && (
                <Chip icon={<Shield className="w-3.5 h-3.5" />}>
                  {[catalog?.ratingsPegi && `PEGI ${catalog.ratingsPegi}`, catalog?.ratingsEsrb && `ESRB ${catalog.ratingsEsrb}`].filter(Boolean).join(" · ")}
                </Chip>
              )}
            </div>

            {catalog && <GameDetailInfo game={catalog} />}
          </div>
        </div>

        <div className="shrink-0 flex flex-col gap-3 p-5 border-t border-white/5 bg-card">
          {installed ? (
            <button
              onClick={onPlayInstalled}
              className="h-14 rounded-2xl font-black flex items-center justify-center gap-3 tracking-[0.2em] text-base italic cursor-pointer bg-gradient-to-br from-primary to-primary-container text-on-primary hover:shadow-[0_15px_40px_rgba(164,230,255,0.25)] active:scale-[0.98] transition-all"
            >
              <span>JOGAR</span>
              <Play size={20} />
            </button>
          ) : (
            <>
              {drives.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {drives.map((drive) => {
                const active = drive.name === selectedDrive;
                return (
                  <button
                    key={drive.name}
                    type="button"
                    onClick={() => setSelectedDrive(drive.name)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer border",
                      active ? "bg-primary text-primary-foreground border-transparent" : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    <HardDrive size={11} />
                    {drive.name.replace(/\\$/, "")}
                    <span className="opacity-70">{drive.free_gb.toFixed(0)} GB livre</span>
                  </button>
                );
              })}
            </div>
          )}

          {!hasSpace && known ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl flex items-center px-4 h-12 gap-3">
              <AlertTriangle size={18} className="text-destructive shrink-0" />
              <span className="text-[10px] text-destructive font-mono tracking-tight normal-case">
                Espaço insuficiente — precisa de mais {shortfall < 1 ? `${(shortfall * 1024).toFixed(0)} MB` : `${shortfall.toFixed(1)} GB`}
              </span>
            </div>
          ) : (
            <div className="bg-surface-low rounded-2xl flex items-center justify-between px-4 h-12 border border-white/10 font-mono text-[11px] text-white/70 normal-case">
              <span className="truncate">{path}</span>
              <span className="shrink-0 text-slate-500 ml-3">{requiredGB.toFixed(1)} GB necessário</span>
            </div>
          )}

          <div className="flex gap-2">
            <div className={cn("flex-[9] flex rounded-2xl overflow-hidden", !hasSpace && "opacity-100")}>
              <button
                onClick={handleDownload}
                disabled={!hasSpace}
                className={cn(
                  "flex-1 h-14 font-black flex items-center justify-center gap-3 transition-all tracking-[0.2em] text-base italic cursor-pointer",
                  hasSpace
                    ? "bg-gradient-to-br from-primary to-primary-container text-on-primary hover:shadow-[0_15px_40px_rgba(164,230,255,0.25)] active:scale-[0.98]"
                    : "bg-destructive/20 text-destructive cursor-not-allowed border border-destructive/20"
                )}
              >
                {!hasSpace ? (
                  <>
                    <AlertTriangle size={20} /> SEM ESPAÇO
                  </>
                ) : (
                  <>
                    <span>BAIXAR</span>
                    {downloadSource === "pixeldrain" ? <Download size={20} /> : <Zap size={20} />}
                  </>
                )}
              </button>

              {hasSpace && pixeldrainOption && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="w-11 h-14 shrink-0 flex items-center justify-center bg-primary/90 text-on-primary border-l border-black/10 hover:bg-primary transition-all cursor-pointer"
                      aria-label="Escolher fonte de download"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setDownloadSource("pixeldrain")}>
                      <Download size={15} className="text-primary shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-white/90">Pixeldrain</p>
                        <p className="text-[9px] text-slate-500 normal-case">Download direto, sem torrent</p>
                      </div>
                      {downloadSource === "pixeldrain" && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setDownloadSource("torrent")}>
                      <Magnet size={15} className="text-primary shrink-0" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-white/90">Torrent</p>
                        <p className="text-[9px] text-slate-500 normal-case">Rede P2P</p>
                      </div>
                      {downloadSource === "torrent" && <CheckCircle2 size={14} className="text-primary shrink-0" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <Tooltip content="Baixar somente o fix" disabled={!hasSpace}>
              <button
                onClick={() => hasSpace && handleDownloadFixOnly()}
                disabled={!hasSpace}
                className={cn(
                  "flex-[1] h-14 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer",
                  hasSpace ? "border-primary/15 bg-white/[0.03] text-primary hover:bg-primary/10" : "border-destructive/15 bg-destructive/10 text-destructive/60"
                )}
              >
                <Wrench size={18} />
                <span className="text-[7px] tracking-[0.2em]">FIX</span>
              </button>
            </Tooltip>
          </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
