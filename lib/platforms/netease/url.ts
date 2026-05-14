import { ResolveError } from "@/lib/errors";
import { NETEASE_SHORT_HOST } from "./constants";

export function normalizeInput(input: string) {
  return input.trim();
}

export function parseNeteaseUrl(input: string) {
  try {
    return new URL(normalizeInput(input));
  } catch {
    throw new ResolveError("这个链接看起来不太对");
  }
}

export function isNeteaseShortLink(input: string) {
  const url = parseNeteaseUrl(input);

  return url.hostname === NETEASE_SHORT_HOST;
}

export function canHandleNeteaseUrl(input: string) {
  try {
    const url = parseNeteaseUrl(input);
    return (
      url.hostname === "music.163.com" ||
      url.hostname === "y.music.163.com" ||
      url.hostname === NETEASE_SHORT_HOST
    );
  } catch {
    return false;
  }
}

export function getMergedSearchParams(input: string) {
  const url = parseNeteaseUrl(input);
  const params = parseQuery(url.search);

  if (url.hash.includes("?")) {
    const hashQuery = url.hash.split("?", 2)[1] ?? "";
    const hashParams = parseQuery(hashQuery);

    hashParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });
  }

  return params;
}

function parseQuery(query: string) {
  const params = new URLSearchParams();
  const normalizedQuery = query.startsWith("?") ? query.slice(1) : query;

  for (const item of normalizedQuery.split("&")) {
    if (!item) {
      continue;
    }

    const [rawKey, rawValue = ""] = item.split("=", 2);
    params.append(decodeComponent(rawKey), decodeComponent(rawValue));
  }

  return params;
}

function decodeComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
