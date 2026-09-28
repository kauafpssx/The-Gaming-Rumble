export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

export function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readString(key: string): string | null {
  return localStorage.getItem(key);
}

export function writeString(key: string, value: string) {
  localStorage.setItem(key, value);
}

export function remove(key: string) {
  localStorage.removeItem(key);
}
