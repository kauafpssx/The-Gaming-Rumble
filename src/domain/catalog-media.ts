/** Direct Steam CDN URL for an achievement icon (no proxy needed — public CDN). */
export function achievementIconUrl(steamAppId: number | null | undefined, icon: string): string {
  return `https://cdn.cloudflare.steamstatic.com/steamcommunity/public/images/apps/${steamAppId ?? 0}/${icon}`;
}
