import "server-only";
import { ResolveError } from "@/lib/errors";
import type { ResolveContext, SanitizeResult } from "../types";
import { XHS_HOME_PREFIX, XHS_PLATFORM_ID, XHS_PLATFORM_LABEL } from "./constants";
import { decodeShareRedId } from "./decode";
import { findXhsUrl, isXhsShortLink, parseXhsUrl } from "./url";

// 小红书分享链接里跟"分享者身份"有关的参数，一键抹除就删这些，笔记 ID（路径）保留。
const SHARER_PARAMS = ["shareRedId", "appuid"] as const;

export async function sanitizeXhsUrl(
  input: string,
  context?: ResolveContext,
): Promise<SanitizeResult> {
  const found = findXhsUrl(input);

  if (!found) {
    throw new ResolveError("这个链接看起来不太对");
  }

  let targetUrl = found;
  let fromShortLink = false;

  if (isXhsShortLink(targetUrl)) {
    if (!context?.resolveShortLink) {
      throw new ResolveError("这个链接暂时打不开，请换一个分享链接试试");
    }

    targetUrl = await context.resolveShortLink(targetUrl);
    fromShortLink = true;
  }

  const { url, noteId } = parseXhsUrl(targetUrl);
  const params = url.searchParams;

  // 先读身份，再删参数
  const shareRedId = params.get("shareRedId");
  const appuid = params.get("appuid");

  const removed: string[] = [];

  for (const key of SHARER_PARAMS) {
    if (params.has(key)) {
      params.delete(key);
      removed.push(key);
    }
  }

  const result: SanitizeResult = {
    platform: XHS_PLATFORM_LABEL,
    platformId: XHS_PLATFORM_ID,
    cleanUrl: url.toString(),
    hadSharerInfo: removed.length > 0,
    removedParams: removed,
    fromShortLink,
    noteId: noteId ?? undefined,
  };

  if (shareRedId) {
    try {
      result.userId = decodeShareRedId(shareRedId);
      result.source = fromShortLink ? "shortlink" : "shareRedId";
      result.profileUrl = `${XHS_HOME_PREFIX}${result.userId}`;
    } catch {
      // 解不开就不报身份，参数照常抹除
    }
  } else if (appuid) {
    result.userId = appuid;
    result.source = fromShortLink ? "shortlink" : "appuid";
    result.profileUrl = `${XHS_HOME_PREFIX}${appuid}`;
  }

  return result;
}
