import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Settings } from "lucide-react";

interface QualityLevel {
  index: number;
  height: number;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** HLS video player with custom themed controls (native on Safari, hls.js/MSE elsewhere). */
export function HlsVideo({ src, poster }: { src: string; poster?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1); // 0-1
  const [volumeHover, setVolumeHover] = useState(false);
  const [scrubbingVolume, setScrubbingVolume] = useState(false);
  const volumeBarRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0); // 0-1
  const [buffered, setBuffered] = useState(0); // 0-1
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const hlsRef = useRef<import("hls.js").default | null>(null);
  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1); // -1 = auto (ABR)
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    let hls: import("hls.js").default | undefined;
    let cancelled = false;

    import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !video) return;
      if (!Hls.isSupported()) {
        video.src = src;
        return;
      }
      hls = new Hls();
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (cancelled) return;
        const parsedLevels: QualityLevel[] = hls!.levels.map((l, index) => ({ index, height: l.height }));
        setLevels(parsedLevels);

        // Prefer 1080p: exact match, else the highest quality at or below 1080p, else the lowest available.
        const exact = parsedLevels.find((l) => l.height === 1080);
        const belowOrEqual = parsedLevels.filter((l) => l.height <= 1080).sort((a, b) => b.height - a.height)[0];
        const preferred = exact ?? belowOrEqual ?? parsedLevels.slice().sort((a, b) => a.height - b.height)[0];
        if (preferred) {
          hls!.currentLevel = preferred.index;
          setCurrentLevel(preferred.index);
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);
    });

    return () => {
      cancelled = true;
      hlsRef.current = null;
      setLevels([]);
      setCurrentLevel(-1);
      hls?.destroy();
    };
  }, [src]);

  const selectQuality = useCallback((index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = index;
    setCurrentLevel(index);
    setShowQualityMenu(false);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => {
      if (!scrubbing) setProgress(video.duration ? video.currentTime / video.duration : 0);
      setCurrent(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.duration ? video.buffered.end(video.buffered.length - 1) / video.duration : 0);
      }
    };
    const onLoaded = () => setDuration(video.duration || 0);
    const onVolume = () => {
      setMuted(video.muted);
      setVolume(video.volume);
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("progress", onTime);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("volumechange", onVolume);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("progress", onTime);
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("volumechange", onVolume);
    };
  }, [scrubbing]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const setVolumeFromClientX = useCallback((clientX: number) => {
    const bar = volumeBarRef.current;
    const video = videoRef.current;
    if (!bar || !video) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    video.volume = ratio;
    video.muted = ratio === 0;
  }, []);

  useEffect(() => {
    if (!scrubbingVolume) return;
    const onMove = (e: MouseEvent) => setVolumeFromClientX(e.clientX);
    const onUp = () => setScrubbingVolume(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [scrubbingVolume, setVolumeFromClientX]);

  const seekFromClientX = useCallback((clientX: number) => {
    const bar = progressRef.current;
    const video = videoRef.current;
    if (!bar || !video || !video.duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setProgress(ratio);
    video.currentTime = ratio * video.duration;
  }, []);

  useEffect(() => {
    if (!scrubbing) return;
    const onMove = (e: MouseEvent) => seekFromClientX(e.clientX);
    const onUp = () => setScrubbing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [scrubbing, seekFromClientX]);

  return (
    <div
      className="relative w-full h-full bg-black group/player select-none"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (!scrubbing) setShowControls(false);
        setShowQualityMenu(false);
      }}
    >
      <video
        ref={videoRef}
        poster={poster}
        onClick={togglePlay}
        className="w-full h-full object-cover bg-black cursor-pointer"
      />

      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
        >
          <span className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/90 text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform">
            <Play className="w-7 h-7 ml-1" />
          </span>
        </button>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 px-3 pb-2 pt-8 bg-gradient-to-t from-black/85 to-transparent transition-opacity duration-200 ${
          showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <div
          ref={progressRef}
          onMouseDown={(e) => {
            setScrubbing(true);
            seekFromClientX(e.clientX);
          }}
          className="group relative h-3 flex items-center cursor-pointer"
        >
          <div className="relative w-full h-1 rounded-full bg-white/25 overflow-hidden group-hover:h-1.5 transition-all">
            <div className="absolute inset-y-0 left-0 bg-white/35 rounded-full" style={{ width: `${buffered * 100}%` }} />
            <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: `${progress * 100}%` }} />
          </div>
          <div
            className="absolute w-3 h-3 rounded-full bg-primary shadow scale-0 group-hover:scale-100 transition-transform"
            style={{ left: `clamp(0px, calc(${progress * 100}% - 6px), calc(100% - 12px))` }}
          />
        </div>

        <div className="flex items-center gap-3 mt-1.5">
          <button onClick={togglePlay} className="text-white hover:text-primary transition-colors">
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <div
            className="flex items-center group/volume"
            onMouseEnter={() => setVolumeHover(true)}
            onMouseLeave={() => !scrubbingVolume && setVolumeHover(false)}
          >
            <button onClick={toggleMute} className="text-white hover:text-primary transition-colors shrink-0">
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                volumeHover || scrubbingVolume ? "w-16 ml-2" : "w-0 ml-0"
              }`}
            >
              <div
                ref={volumeBarRef}
                onMouseDown={(e) => {
                  setScrubbingVolume(true);
                  setVolumeFromClientX(e.clientX);
                }}
                className="group/bar relative h-3 w-16 flex items-center cursor-pointer"
              >
                <div className="relative w-full h-1 rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-white rounded-full"
                    style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                  />
                </div>
                <div
                  className="absolute w-2.5 h-2.5 rounded-full bg-white shadow"
                  style={{ left: `clamp(0px, calc(${(muted ? 0 : volume) * 100}% - 5px), calc(100% - 10px))` }}
                />
              </div>
            </div>
          </div>
          <span className="text-[11px] text-white/80 font-medium tabular-nums">
            {formatTime(current)} / {formatTime(duration)}
          </span>
          <div className="flex-1" />

          {levels.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowQualityMenu((v) => !v)}
                className="text-white hover:text-primary transition-colors flex items-center gap-1"
              >
                <Settings className="w-4 h-4" />
                <span className="text-[11px] font-medium tabular-nums">
                  {currentLevel === -1 ? "Auto" : `${levels.find((l) => l.index === currentLevel)?.height}p`}
                </span>
              </button>
              {showQualityMenu && (
                <div className="absolute bottom-full right-0 mb-2 min-w-[100px] rounded-lg bg-black/90 border border-white/10 py-1 shadow-xl">
                  <button
                    onClick={() => selectQuality(-1)}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${
                      currentLevel === -1 ? "text-primary" : "text-white"
                    }`}
                  >
                    Auto
                  </button>
                  {levels
                    .slice()
                    .sort((a, b) => b.height - a.height)
                    .map((l) => (
                      <button
                        key={l.index}
                        onClick={() => selectQuality(l.index)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-white/10 transition-colors ${
                          currentLevel === l.index ? "text-primary" : "text-white"
                        }`}
                      >
                        {l.height}p
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
