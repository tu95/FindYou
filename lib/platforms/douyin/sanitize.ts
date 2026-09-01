import "server-only";
import { ResolveError } from "@/lib/errors";
import type { ResolveContext, SanitizeResult } from "../types";
import { DOUYIN_PLATFORM_ID, DOUYIN_PLATFORM_LABEL } from "./constants";
import { parseActivityInfo } from "./decode";
import { extractAwemeIdFromUrl, identifyDouyinInput } from "./url";

// 抖音分享链接里跟"分享者身份"有关的参数：activity_info（含分享者 User ID）、u_code（分享者归属码）
const SHARER_PARAMS = ["activity_info", "u_code"] as const;

// 字符串级抹参数（保持原始编码不被 URL 重序列化改写）
export function stripDouyinSharerParams(rawUrl: string): string {
  let out = rawUrl;
  for (const key of SHARER_PARAMS) {
    out = out.replace(new RegExp(`[?&]${key}=[^&]*`, "g"), (match) =>
      match.startsWith("?") ? "?" : "",
    );
  }
  return out.replace(/\?&/g, "?").replace(/[?&]$/, "");
}

export async function sanitizeDouyinUrl(
  input: string,
  context?: ResolveContext,
): Promise<SanitizeResult> {
  const found = identifyDouyinInput(input);

  if (!found) {
    throw new ResolveError("这个链接看起来不太对");
  }

  let targetUrl = found.url ?? "";
  let fromShortLink = false;

  if (found.kind === "short_link" && targetUrl) {
    if (!context?.resolveShortLink) {
      throw new ResolveError("这个链接暂时打不开，请换一个分享链接试试");
    }

    targetUrl = await context.resolveShortLink(targetUrl);
    fromShortLink = true;
  }

  // 裸 ID 输入：没有链接可脱敏，原样返回
  if (found.kind === "aweme_id" || found.kind === "uid" || found.kind === "sec_uid") {
    return {
      platform: DOUYIN_PLATFORM_LABEL,
      platformId: DOUYIN_PLATFORM_ID,
      cleanUrl: input.trim(),
      hadSharerInfo: false,
      removedParams: [],
      fromShortLink,
    };
  }

  const cleanUrl = stripDouyinSharerParams(targetUrl);
  const removed: string[] = [];

  for (const key of SHARER_PARAMS) {
    if (new RegExp(`[?&]${key}=`).test(targetUrl)) {
      removed.push(key);
    }
  }

  const result: SanitizeResult = {
    platform: DOUYIN_PLATFORM_LABEL,
    platformId: DOUYIN_PLATFORM_ID,
    cleanUrl,
    hadSharerInfo: removed.length > 0,
    removedParams: removed,
    fromShortLink,
  };

  // 作品 ID 通用提取（视频/图文/未来形态），脱敏流程同样不依赖内容类型
  result.noteId = found.awemeId ?? extractAwemeIdFromUrl(targetUrl);

  // activity_info 里的分享者 ID 可以本地解出（不需要再请求接口）
  try {
    const activityInfo = parseActivityInfo(new URL(targetUrl).searchParams.get("activity_info"));
    if (activityInfo?.shareUserId) {
      result.userId = activityInfo.shareUserId;
      result.source = fromShortLink ? "shortlink" : "activity_info";
    }
  } catch {
    // 解析不了就跳过
  }

  return result;
}
