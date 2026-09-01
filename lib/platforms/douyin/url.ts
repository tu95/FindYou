import "server-only";
import { DOUYIN_HOSTS, DOUYIN_SHORT_HOSTS } from "./constants";

// 分享文本里抽 URL：从空白和中文标点处截断（分享口令常见后缀 "01/02 tEU:/" 等）
const URL_PATTERN = /https?:\/\/[^\s，。；：！？、（）【】《》“”‘’<>"']+/g;

const AWEME_ID_PATTERN = /^\d{19}$/;
const UID_PATTERN = /^\d{9,12}$/;
const SEC_UID_PATTERN = /^MS4wLjAB[A-Za-z0-9_-]{20,}$/;

export type DouyinInputKind =
  | "short_link" // v.douyin.com 短链（需在线解析）
  | "video_url" // douyin.com/video/{id} 或 iesdouyin.com/share/video/{id}
  | "user_url" // douyin.com/user/{sec_uid}
  | "aweme_id" // 裸 19 位视频 ID
  | "uid" // 裸 9~12 位用户 ID
  | "sec_uid"; // 裸 MS4wLjAB... 主页 ID

export interface DouyinInput {
  kind: DouyinInputKind;
  url?: string;
  awemeId?: string;
  uid?: string;
  secUid?: string;
}

export function isDouyinHost(hostname: string) {
  return (
    DOUYIN_HOSTS.includes(hostname as (typeof DOUYIN_HOSTS)[number]) ||
    DOUYIN_SHORT_HOSTS.includes(hostname as (typeof DOUYIN_SHORT_HOSTS)[number])
  );
}

export function canHandleDouyinInput(input: string) {
  return identifyDouyinInput(input) !== null;
}

export function identifyDouyinInput(input: string): DouyinInput | null {
  const trimmed = input.trim();

  // 裸 ID 形态：整段输入就是一个 ID
  if (AWEME_ID_PATTERN.test(trimmed)) {
    return { kind: "aweme_id", awemeId: trimmed };
  }
  if (SEC_UID_PATTERN.test(trimmed)) {
    return { kind: "sec_uid", secUid: trimmed };
  }
  if (UID_PATTERN.test(trimmed)) {
    return { kind: "uid", uid: trimmed };
  }

  // 从文本里提取 douyin 相关链接（优先短链）
  const urls = [...trimmed.matchAll(URL_PATTERN)]
    .map((match) => match[0])
    .filter((raw) => {
      try {
        return isDouyinHost(new URL(raw).hostname);
      } catch {
        return false;
      }
    });
  const shortUrl = urls.find((raw) => raw.includes("v.douyin.com"));
  const url = shortUrl ?? urls[0];

  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (parsed.hostname === "v.douyin.com") {
      return { kind: "short_link", url };
    }

    if (segments[0] === "user" && segments[1]) {
      return { kind: "user_url", url, secUid: segments[1] };
    }

    // 作品 ID：路径里第一个 19 位纯数字段（视频/图文/未来新形态通用）
    const awemeId = segments.find((segment) => AWEME_ID_PATTERN.test(segment));
    if (awemeId) {
      return { kind: "video_url", url, awemeId };
    }
  } catch {
    return null;
  }

  return null;
}

export function isDirectUrlInput(input: string) {
  try {
    new URL(input.trim());
    return true;
  } catch {
    return false;
  }
}

// 从 URL 路径里通用提取作品 ID：不按 video/note 等内容类型词白名单匹配，
// 任何形态的作品 ID 都是 19 位纯数字路径段（/share/video/{id}、/share/note/{id} 及未来新形态通吃）
export function extractAwemeIdFromUrl(url: string): string | undefined {
  try {
    const segments = new URL(url).pathname.split("/").filter(Boolean);
    return segments.find((segment) => AWEME_ID_PATTERN.test(segment));
  } catch {
    return undefined;
  }
}
