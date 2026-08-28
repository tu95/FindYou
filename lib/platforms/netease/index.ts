import "server-only";
import { ResolveError } from "@/lib/errors";
import type { PlatformResolver, ResolveContext, ResolveResult } from "../types";
import {
  NETEASE_HOME_PREFIX,
  NETEASE_PLATFORM_ID,
  NETEASE_PLATFORM_LABEL,
} from "./constants";
import { decodeLegacyUct, decodeUct2 } from "./decode";
import { sanitizeNeteaseUrl } from "./sanitize";
import {
  findNeteaseUrl,
  getMergedSearchParams,
  isNeteaseShortLink,
} from "./url";

function buildResult(payload: Omit<ResolveResult, "platform" | "platformId" | "profileUrl">) {
  return {
    ...payload,
    platform: NETEASE_PLATFORM_LABEL,
    platformId: NETEASE_PLATFORM_ID,
    profileUrl: `${NETEASE_HOME_PREFIX}${payload.userId}`,
  };
}

export const neteaseResolver: PlatformResolver = {
  id: NETEASE_PLATFORM_ID,
  label: NETEASE_PLATFORM_LABEL,
  canHandle: (input) => findNeteaseUrl(input) !== null,
  async resolve(input: string, context?: ResolveContext) {
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

    const params = getMergedSearchParams(targetUrl);
    const pageId = params.get("id");
    const isUserHome = targetUrl.includes("/user/home");

    if (isUserHome && pageId) {
      return buildResult({
        userId: pageId,
        targetUrl,
        source: "userid",
        algorithm: "链接里直接带着",
      });
    }

    const userid = params.get("userid");

    if (userid) {
      return buildResult({
        userId: userid,
        targetUrl,
        source: fromShortLink ? "shortlink" : "userid",
        algorithm: fromShortLink ? "从分享链接里找到" : "链接里直接带着",
      });
    }

    const uct2 = params.get("uct2");

    if (uct2) {
      const decoded = decodeUct2(uct2);
      return buildResult({
        ...decoded,
        targetUrl,
        source: fromShortLink ? "shortlink" : decoded.source,
        algorithm: fromShortLink ? "从分享链接里找到" : decoded.algorithm,
      });
    }

    const uct = params.get("uct");

    if (uct) {
      const decoded = decodeLegacyUct(uct);
      return buildResult({
        ...decoded,
        targetUrl,
        source: fromShortLink ? "shortlink" : decoded.source,
        algorithm: fromShortLink ? "从分享链接里找到" : decoded.algorithm,
      });
    }

    throw new ResolveError("这条链接里没找到分享者信息");
  },
  sanitize: (input, context) => sanitizeNeteaseUrl(input, context),
};
