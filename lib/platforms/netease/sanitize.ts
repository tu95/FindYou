import "server-only";
import { ResolveError } from "@/lib/errors";
import type { ResolveContext, ResolveSource, SanitizeResult } from "../types";
import { NETEASE_HOME_PREFIX, NETEASE_PLATFORM_ID, NETEASE_PLATFORM_LABEL } from "./constants";
import { decodeLegacyUct, decodeUct2 } from "./decode";
import { findNeteaseUrl, getMergedSearchParams, isNeteaseShortLink, parseNeteaseUrl } from "./url";

// 网易云分享链接里跟"分享者身份"有关的参数，一键抹除就删这些，内容 ID（id）保留。
const SHARER_PARAMS = ["userid", "uct2", "uct"] as const;

// 从参数里识别分享者：userid 明文、uct2 加密、uct 旧版加密。
function detectSharer(params: URLSearchParams): { userId: string; source: ResolveSource } | null {
  const userid = params.get("userid");

  if (userid) {
    return { userId: userid, source: "userid" };
  }

  const uct2 = params.get("uct2");

  if (uct2) {
    try {
      const decoded = decodeUct2(uct2);
      return { userId: decoded.userId, source: decoded.source };
    } catch {
      // 解不开就不报身份，参数照常抹除
    }
  }

  const uct = params.get("uct");

  if (uct) {
    try {
      return { userId: decodeLegacyUct(uct).userId, source: "uct" };
    } catch {
      // 同上
    }
  }

  return null;
}

// 从 search 和 hash（#/song?id=..&userid=.. 这种）里删掉分享者参数，重建 URL。
function stripSharerParams(url: URL): { removed: string[] } {
  const removed = new Set<string>();

  const search = new URLSearchParams(url.search);

  for (const key of SHARER_PARAMS) {
    if (search.has(key)) {
      search.delete(key);
      removed.add(key);
    }
  }

  url.search = search.toString();

  if (url.hash.includes("?")) {
    const [path, query = ""] = url.hash.split("?", 2);
    const hashParams = new URLSearchParams(query);
    let hashChanged = false;

    for (const key of SHARER_PARAMS) {
      if (hashParams.has(key)) {
        hashParams.delete(key);
        removed.add(key);
        hashChanged = true;
      }
    }

    if (hashChanged) {
      url.hash = `${path}?${hashParams.toString()}`;
    }
  }

  return { removed: [...removed] };
}

export async function sanitizeNeteaseUrl(
  input: string,
  context?: ResolveContext,
): Promise<SanitizeResult> {
  const found = findNeteaseUrl(input);

  if (!found) {
    throw new ResolveError("这个链接看起来不太对");
  }

  let targetUrl = found;
  let fromShortLink = false;

  if (isNeteaseShortLink(targetUrl)) {
    if (!context?.resolveShortLink) {
      throw new ResolveError("这个链接暂时打不开，请换一个分享链接试试");
    }

    targetUrl = await context.resolveShortLink(targetUrl);
    fromShortLink = true;
  }

  const url = parseNeteaseUrl(targetUrl);
  const sharer = detectSharer(getMergedSearchParams(targetUrl));
  const { removed } = stripSharerParams(url);

  const result: SanitizeResult = {
    platform: NETEASE_PLATFORM_LABEL,
    platformId: NETEASE_PLATFORM_ID,
    cleanUrl: url.toString(),
    hadSharerInfo: removed.length > 0,
    removedParams: removed,
    fromShortLink,
  };

  if (sharer) {
    result.userId = sharer.userId;
    result.source = fromShortLink ? "shortlink" : sharer.source;
    result.profileUrl = `${NETEASE_HOME_PREFIX}${sharer.userId}`;
  }

  return result;
}
