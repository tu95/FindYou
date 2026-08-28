import "server-only";
import { ResolveError } from "@/lib/errors";
import {
  DOUYIN_API_HEADERS,
  DOUYIN_BROWSER_PARAMS,
  DOUYIN_TTWID_API,
  DOUYIN_USER_API,
} from "./constants";

const REQUEST_TIMEOUT_MS = 15000;

export interface DouyinUser {
  uid?: string;
  sec_uid?: string;
  nickname?: string;
  unique_id?: string;
  signature?: string;
}

async function fetchJson(url: string, init?: RequestInit) {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ResolveError("抖音接口请求超时，请稍后再试", 502);
  }

  // 网关拦截特征：404 Unsupported path(Janus) / 403 blocked
  if (response.status === 403 || response.status === 404) {
    throw new ResolveError("抖音接口暂时被拦截（风控），请稍后再试", 502);
  }

  if (!response.ok) {
    throw new ResolveError("抖音接口请求失败，请稍后再试", 502);
  }

  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new ResolveError("抖音接口返回异常，请稍后再试", 502);
  }
}

// 通过 bytedance 官方注册接口拿 ttwid cookie（每次现取即可，无需缓存）
export async function getTtwid(): Promise<string | null> {
  const data = await fetchJson(DOUYIN_TTWID_API, {
    method: "POST",
    headers: { ...DOUYIN_API_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      region: "cn",
      aid: 1768,
      needFid: false,
      service: "www.douyin.com",
      migrate_info: { ticket: "", source: "node" },
      cbUrlProtocol: "https",
      union: true,
    }),
  });

  const callbackUrl = typeof data.redirect_url === "string" ? data.redirect_url : null;
  if (!callbackUrl) {
    return null;
  }

  const callbackResponse = await fetch(callbackUrl, {
    headers: DOUYIN_API_HEADERS,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  for (const cookie of callbackResponse.headers.getSetCookie?.() ?? []) {
    const match = cookie.match(/^ttwid=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function browserParams(extra: Record<string, string>) {
  return { ...DOUYIN_BROWSER_PARAMS, ...extra };
}

async function apiGet(ttwid: string | null, baseUrl: string, params: Record<string, string>) {
  // 注意：URL 拼接必须带 ?（拼成 detail/device_platform=... 会 404 Unsupported path）
  const url = `${baseUrl}?${new URLSearchParams(params).toString()}`;
  const headers = ttwid ? { ...DOUYIN_API_HEADERS, Cookie: `ttwid=${ttwid}` } : DOUYIN_API_HEADERS;
  const data = await fetchJson(url, { headers });

  if (data.status_code === 2) {
    throw new ResolveError("抖音参数不合法（用户不存在或已注销）");
  }

  return data;
}

export async function getUserProfile(
  ttwid: string | null,
  opts: { uid?: string; secUid?: string },
): Promise<DouyinUser | undefined> {
  const params = browserParams({
    max_cursor: "0",
    locate_query: "false",
    show_live_replay_strategy: "1",
    need_time_list: "1",
    time_list_query: "0",
    whale_cut_token: "",
    cut_version: "1",
    count: "18",
    publish_video_strategy_type: "2",
    from_user_page: "1",
    ...(opts.uid ? { user_id: opts.uid } : { sec_user_id: opts.secUid ?? "" }),
  });
  const data = await apiGet(ttwid, DOUYIN_USER_API, params);
  return data.user as DouyinUser | undefined;
}
