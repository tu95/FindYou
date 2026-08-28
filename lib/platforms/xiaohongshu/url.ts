import "server-only";
import { ResolveError } from "@/lib/errors";
import { XHS_SHORT_HOSTS } from "./constants";

// 完整链接 / 短链。文本里提取时停在中文标点（分享文案常见后缀）。
const FULL_URL_PATTERN =
  /https?:\/\/(?:www\.)?xiaohongshu\.com\/[A-Za-z0-9_.~!$&'()*+,;=:@/?%-]*/g;
const SHORT_URL_PATTERN = /https?:\/\/xhslink\.(?:com|cn)\/[A-Za-z0-9_./-]+/g;

// 小红书链接类型（与分享者信息有无强相关）
export type XhsLinkType =
  | "short_link"
  | "user_profile"
  | "app_share_encrypted"
  | "app_share_plain"
  | "web_share"
  | "other";

export function isXhsHost(hostname: string) {
  return hostname === "xiaohongshu.com" || hostname === "www.xiaohongshu.com";
}

export function isXhsShortHost(hostname: string) {
  return XHS_SHORT_HOSTS.includes(hostname as (typeof XHS_SHORT_HOSTS)[number]);
}

export function canHandleXhsInput(input: string) {
  return findXhsUrl(input) !== null;
}

export function findXhsUrl(input: string): string | null {
  const trimmed = input.trim();

  // 整段就是一个链接
  try {
    const url = new URL(trimmed);
    if (isXhsHost(url.hostname) || isXhsShortHost(url.hostname)) {
      return url.toString();
    }
    return null;
  } catch {
    // 不是完整链接，继续从分享文本里找
  }

  const clean = (raw: string) => raw.replace(/[，。、；）)」』\]]+$/, "");
  const fullLinks = [...trimmed.matchAll(FULL_URL_PATTERN)].map((match) => clean(match[0]));
  const shortLinks = [...trimmed.matchAll(SHORT_URL_PATTERN)].map((match) => clean(match[0]));

  // 完整链接优先（短链有有效期、还需在线解析），再去重保序取第一个
  return [...new Set([...fullLinks, ...shortLinks])][0] ?? null;
}

export function isDirectUrlInput(input: string) {
  try {
    new URL(input.trim());
    return true;
  } catch {
    return false;
  }
}

export function isXhsShortLink(input: string) {
  return isXhsShortHost(new URL(input).hostname);
}

interface ParsedXhsUrl {
  url: URL;
  noteId: string | null;
  profileUserId: string | null;
}

export function parseXhsUrl(targetUrl: string): ParsedXhsUrl {
  let url: URL;
  try {
    url = new URL(targetUrl);
  } catch {
    throw new ResolveError("这个链接看起来不太对");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  let noteId: string | null = null;
  let profileUserId: string | null = null;

  if (segments[0] === "user") {
    // /user/profile/{id} 或 /user/{id}
    profileUserId = segments[1] === "profile" ? segments[2] ?? null : segments[1] ?? null;
  } else if (segments[0] === "discovery" && segments[1] === "item") {
    // /discovery/item/{noteId}
    noteId = segments[2] ?? null;
  } else if (segments[0] === "explore" || segments[0] === "share") {
    noteId = segments[1] ?? null;
  }

  return { url, noteId, profileUserId };
}

// 链接类型识别：shareRedId/appuid 决定有没有分享者；其余笔记链接归 web_share（平台设计不带分享者）
export function classifyXhsLink(
  url: URL,
  noteId: string | null,
  profileUserId: string | null,
): XhsLinkType {
  if (profileUserId) {
    return "user_profile";
  }

  const params = url.searchParams;

  if (params.get("shareRedId")) {
    return "app_share_encrypted";
  }

  if (params.get("appuid")) {
    return "app_share_plain";
  }

  if (noteId) {
    return "web_share";
  }

  return "other";
}
