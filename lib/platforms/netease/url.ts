import "server-only";
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

// 分享文本里提取链接：完整链接直接返回；否则在文本里找网易云域名开头的链接，停在中文标点（分享文案常见后缀）。
const NETEASE_URL_PATTERN =
  /https?:\/\/(?:music\.163\.com|y\.music\.163\.com|163cn\.tv)\/[^\s，。、；：！？）)」』\]]*/;

export function findNeteaseUrl(input: string): string | null {
  const trimmed = input.trim();

  try {
    const url = new URL(trimmed);
    if (
      url.hostname === "music.163.com" ||
      url.hostname === "y.music.163.com" ||
      url.hostname === NETEASE_SHORT_HOST
    ) {
      return url.toString();
    }
    return null;
  } catch {
    // 不是完整链接，继续从分享文本里找
  }

  const match = trimmed.match(NETEASE_URL_PATTERN);
  if (!match) {
    return null;
  }

  return match[0].replace(/[，。、；）)」』\]]+$/, "");
}

export function canHandleNeteaseUrl(input: string) {
  return findNeteaseUrl(input) !== null;
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
