const FALLBACK_API_BASE = "http://localhost:4000";

function normalizeBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function withLeadingSlash(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function getApiBaseUrl(): string {
  return normalizeBase(process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_BASE);
}

export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${withLeadingSlash(path)}`;
}

export function wsUrl(path: string): string {
  const base = getApiBaseUrl();
  const wsBase = base.startsWith("https://")
    ? base.replace("https://", "wss://")
    : base.replace("http://", "ws://");
  return `${wsBase}${withLeadingSlash(path)}`;
}
