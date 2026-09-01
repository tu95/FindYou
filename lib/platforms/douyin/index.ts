import "server-only";
import { ResolveError } from "@/lib/errors";
import type { PlatformResolver, ResolveContext, ResolveResult } from "../types";
import { DOUYIN_HOME_PREFIX, DOUYIN_PLATFORM_ID, DOUYIN_PLATFORM_LABEL, DOUYIN_VIDEO_PREFIX } from "./constants";
import { getTtwid, getUserProfile } from "./api";
import { parseActivityInfo } from "./decode";
import { sanitizeDouyinUrl, stripDouyinSharerParams } from "./sanitize";
import { extractAwemeIdFromUrl, identifyDouyinInput, isDirectUrlInput } from "./url";

function toUnixSeconds(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildResult(payload: Omit<ResolveResult, "platform" | "platformId">) {
  return {
    ...payload,
    platform: DOUYIN_PLATFORM_LABEL,
    platformId: DOUYIN_PLATFORM_ID,
  };
}

export const douyinResolver: PlatformResolver = {
  id: DOUYIN_PLATFORM_ID,
  label: DOUYIN_PLATFORM_LABEL,
  canHandle: (input) => identifyDouyinInput(input) !== null,
  async resolve(input: string, context?: ResolveContext) {
    let found = identifyDouyinInput(input);

    if (!found) {
      throw new ResolveError("这个链接看起来不太对");
    }

    let targetUrl = found.url ?? "";
    let fromShortLink = false;
    let firstHopParams: URLSearchParams | null = null;

    // 短链：在线解析第一跳 Location（activity_info / u_code 等关键参数都在这一跳）
    if (found.kind === "short_link") {
      if (!context?.resolveShortLink) {
        throw new ResolveError("这个链接暂时打不开，请换一个分享链接试试");
      }

      targetUrl = await context.resolveShortLink(targetUrl);
      fromShortLink = true;

      try {
        firstHopParams = new URL(targetUrl).searchParams;
      } catch {
        firstHopParams = null;
      }

      // 第一跳落点重新识别：分享用户主页的短链（/user/{sec_uid}）也走主页查询分支
      const hop = identifyDouyinInput(targetUrl);
      if (hop?.kind === "user_url" && hop.secUid) {
        found = hop;
      }
    }

    const sourceType = found.url
      ? fromShortLink
        ? "short_url"
        : isDirectUrlInput(input)
          ? "full_url"
          : "share_text"
      : undefined;

    // ---- 用户身份查询：裸 uid / 裸 sec_uid / 用户主页链接 ----
    if (found.kind === "uid" || found.kind === "sec_uid" || found.kind === "user_url") {
      if (!found.uid && !found.secUid) {
        throw new ResolveError("这个链接暂时还解析不了");
      }

      const ttwid = await getTtwid();

      if (!ttwid) {
        throw new ResolveError("抖音接口暂时不可用，请稍后再试", 502);
      }

      const user = await getUserProfile(ttwid, { uid: found.uid, secUid: found.secUid });

      if (!user?.uid) {
        throw new ResolveError("这个抖音用户不存在或已注销");
      }

      const homepage = user.sec_uid ? `${DOUYIN_HOME_PREFIX}${user.sec_uid}` : undefined;

      return buildResult({
        userId: user.uid,
        profileUrl: homepage,
        targetUrl: homepage ?? targetUrl,
        source: found.kind === "uid" ? "uid" : "sec_uid",
        algorithm: "通过用户主页接口查到的",
        linkType: found.kind === "user_url" ? "user_profile" : found.kind,
        sourceType,
      });
    }

    // ---- 作品相关：短链 / 作品链接（视频、图文及任何形态）/ 裸 aweme_id ----
    // 作品 ID 通用提取（路径里 19 位纯数字段）；分享者解析只依赖 activity_info，
    // 不因作品类型不认识或 ID 提取失败而中断
    const awemeId = found.awemeId ?? extractAwemeIdFromUrl(targetUrl);

    // 裸 aweme_id 没有链接，用构造的作品地址兜底（打开作品/脱敏链接都可用）
    const contentUrl = targetUrl || (awemeId ? `${DOUYIN_VIDEO_PREFIX}${awemeId}` : "");
    const targetParams = targetUrl ? new URL(targetUrl).searchParams : null;

    // 分享者信息在 activity_info 里（新版分享链接才有），纯本地解析
    const activityInfo = parseActivityInfo(
      firstHopParams?.get("activity_info") ?? targetParams?.get("activity_info"),
    );

    const meta = {
      noteId: awemeId,
      linkType: found.kind === "video_url" ? "video" : found.kind,
      sourceType,
      cleanUrl: stripDouyinSharerParams(contentUrl),
      shareChannel: (firstHopParams ?? targetParams)?.get("tt_from") ?? undefined,
      shareTime: toUnixSeconds(activityInfo?.shareTime),
      shareEventId: activityInfo?.shareId,
    };

    if (activityInfo?.shareUserId) {
      let sharerProfileUrl: string | undefined;

      // 分享者主页反查（尽力而为：反查失败不影响主结果）
      try {
        const ttwid = await getTtwid();
        if (ttwid) {
          const sharer = await getUserProfile(ttwid, { uid: activityInfo.shareUserId });
          if (sharer?.sec_uid) {
            sharerProfileUrl = `${DOUYIN_HOME_PREFIX}${sharer.sec_uid}`;
          }
        }
      } catch {
        // 忽略，仅拿不到主页链接
      }

      return buildResult({
        userId: activityInfo.shareUserId,
        profileUrl: sharerProfileUrl,
        targetUrl: contentUrl,
        source: fromShortLink ? "shortlink" : "activity_info",
        algorithm: fromShortLink
          ? "从分享链接里找到"
          : "从链接参数 activity_info 里解出的分享者",
        ...meta,
      });
    }

    // 老版分享/私信转发：链接里没有分享者信息
    return buildResult({
      userId: undefined,
      targetUrl: contentUrl,
      source: fromShortLink ? "shortlink" : found.kind === "aweme_id" ? "aweme_id" : "video",
      algorithm: "链接里没有分享者信息",
      shareUserIdReason:
        "这条抖音分享链接没有携带分享者信息（老版分享/私信转发），无法获取分享者",
      ...meta,
    });
  },
  sanitize: (input, context) => sanitizeDouyinUrl(input, context),
};
