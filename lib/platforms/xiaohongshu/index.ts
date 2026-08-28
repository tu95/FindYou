import "server-only";
import { ResolveError } from "@/lib/errors";
import type { PlatformResolver, ResolveContext, ResolveResult } from "../types";
import { XHS_HOME_PREFIX, XHS_PLATFORM_ID, XHS_PLATFORM_LABEL } from "./constants";
import { decodeShareRedId } from "./decode";
import { sanitizeXhsUrl } from "./sanitize";
import {
  canHandleXhsInput,
  classifyXhsLink,
  findXhsUrl,
  isDirectUrlInput,
  isXhsShortLink,
  parseXhsUrl,
} from "./url";

function buildResult(payload: Omit<ResolveResult, "platform" | "platformId" | "profileUrl">) {
  return {
    ...payload,
    platform: XHS_PLATFORM_LABEL,
    platformId: XHS_PLATFORM_ID,
    profileUrl: payload.userId ? `${XHS_HOME_PREFIX}${payload.userId}` : undefined,
  };
}

function toUnixSeconds(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

// 脱敏链接：抹掉分享者参数，其余原样保留。
// 用字符串级替换而不是 URL 重序列化——URL.toString() 会把 query 值里的
// = 重编码成 %3D（xsec_token 里就有 =），复制出去的链接会变样。
function stripSharerParams(rawUrl: string): string {
  const out = rawUrl.replace(/[?&](shareRedId|appuid)=[^&]*/g, (match) =>
    match.startsWith("?") ? "?" : "",
  );
  return out.replace(/\?&/g, "?").replace(/[?&]$/, "");
}

export const xiaohongshuResolver: PlatformResolver = {
  id: XHS_PLATFORM_ID,
  label: XHS_PLATFORM_LABEL,
  canHandle: canHandleXhsInput,
  async resolve(input: string, context?: ResolveContext) {
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

    const { url, noteId, profileUserId } = parseXhsUrl(targetUrl);

    // 短链解析后落到裸域名（兜底页），说明短链已失效
    if (fromShortLink && !noteId && !profileUserId) {
      throw new ResolveError("这条分享链接已经失效了，请重新复制一条再试", 410);
    }

    const params = url.searchParams;
    const linkType = classifyXhsLink(url, noteId, profileUserId);
    const sourceType = isDirectUrlInput(input)
      ? fromShortLink
        ? "short_url"
        : "full_url"
      : "share_text";

    const meta = {
      noteId: noteId ?? undefined,
      linkType,
      sourceType,
      cleanUrl: stripSharerParams(targetUrl),
      shareTime: toUnixSeconds(params.get("apptime")),
      shareChannel: params.get("xhsshare") ?? undefined,
      shareEventId: params.get("share_id") ?? undefined,
      xsecToken: params.get("xsec_token") ?? undefined,
      appVersion: params.get("app_version") ?? undefined,
    };

    switch (linkType) {
      case "user_profile":
        // 用户主页链接：路径里的就是用户 ID
        return buildResult({
          userId: profileUserId ?? undefined,
          targetUrl,
          source: fromShortLink ? "shortlink" : "user_profile",
          algorithm: fromShortLink ? "从分享链接里找到" : "链接里直接带着",
          ...meta,
        });

      case "app_share_encrypted":
        // 新版分享链接：shareRedId 是加密的分享者 ID，本地解码
        return buildResult({
          userId: decodeShareRedId(params.get("shareRedId") ?? ""),
          targetUrl,
          source: fromShortLink ? "shortlink" : "shareRedId",
          algorithm: fromShortLink ? "从分享链接里找到" : "从链接参数 shareRedId 解码出来的",
          ...meta,
        });

      case "app_share_plain":
        // 旧版分享链接：appuid 明文直接带在链接里
        return buildResult({
          userId: params.get("appuid") ?? undefined,
          targetUrl,
          source: fromShortLink ? "shortlink" : "appuid",
          algorithm: fromShortLink ? "从分享链接里找到" : "链接里直接带着",
          ...meta,
        });

      case "web_share":
        // 网页版/PC 分享：平台设计不携带分享者信息，交付笔记信息并说明原因，不报错
        return buildResult({
          targetUrl,
          source: fromShortLink ? "shortlink" : "web_share",
          algorithm: fromShortLink ? "从分享链接里找到" : "网页版链接不携带分享者信息",
          shareUserIdReason:
            "网页版/PC 分享链接不携带分享者信息（平台设计），只有 App 内分享的链接（shareRedId/appuid）才能解出分享者",
          ...meta,
        });

      default:
        throw new ResolveError("这个链接暂时还解析不了");
    }
  },
  sanitize: (input, context) => sanitizeXhsUrl(input, context),
};
