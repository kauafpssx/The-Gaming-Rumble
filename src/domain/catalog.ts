/** Espelha src-tauri/src/services/catalog/model.rs */
export interface CatalogFile {
  name: string;
  size: string;
}

export interface CatalogMovie {
  thumbnail: string;
  dashUrl?: string | null;
  hlsUrl?: string | null;
}

export interface CatalogAchievement {
  name: string;
  icon: string;
}

export interface CatalogHosterLink {
  fileName: string;
  directLink: string;
}

export interface CatalogEntry {
  id: string;
  title: string;
  magnet: string;
  fileSize: string;
  parts: number;
  banner: string;
  capsule: string;
  background: string;
  description: string;
  genres: string[];
  categories: string[];
  priceBrl?: string | null;
  isFree: boolean;
  steamAppId?: number | null;
  releaseDate: string;
  releaseDateSteam?: string | null;
  lastUpdate?: string | null;
  updateDate?: string | null;
  createdAt?: string | null;
  controllerSupport?: string | null;
  ratingsPegi?: string | null;
  ratingsEsrb?: string | null;
  requirementsMinimum?: string | null;
  requirementsRecommended?: string | null;
  achievementsTotal: number;
  achievements: CatalogAchievement[];
  screenshots: string[];
  movies: CatalogMovie[];
  files: CatalogFile[];
  hosterLinks: Record<string, CatalogHosterLink[]>;
}

export interface CatalogStats {
  totalGames: number;
  onlineFixTotal: number;
  steamWithMetadata: number;
  gamesWithProviders: number;
  matchRate: number;
  lastScrapeAtDisplay: string;
  generatedAtDisplay: string;
  latestRunNewGameNames: string[];
  latestRunUpdatedGameNames: string[];
}

export interface CatalogSyncResult {
  games: CatalogEntry[];
  stats: CatalogStats;
  fromCache: boolean;
}
