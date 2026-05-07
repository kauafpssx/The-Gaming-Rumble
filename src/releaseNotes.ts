const releaseNoteFiles = import.meta.glob("../.github/releases/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const CHANGELOG_REPO_URL = "https://github.com/zKauaFerreira/The-Gaming-Rumble";

function normalizeVersion(version: string) {
  return version.replace(/^v/i, "").trim();
}

export function getReleaseNotes(version: string): string | null {
  const normalizedVersion = normalizeVersion(version);
  const tag = `v${normalizedVersion}`;
  const expectedSuffix = `/v${normalizedVersion}.md`;

  for (const [path, content] of Object.entries(releaseNoteFiles)) {
    if (path.endsWith(expectedSuffix)) {
      return content
        .split("{{version}}").join(normalizedVersion)
        .split("{{tag}}").join(tag)
        .split("{{changelog_url}}").join(`${CHANGELOG_REPO_URL}/commits/${tag}`);
    }
  }

  return null;
}
