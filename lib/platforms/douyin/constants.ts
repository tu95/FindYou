import "server-only";

export const DOUYIN_PLATFORM_ID = "douyin";
export const DOUYIN_PLATFORM_LABEL = "抖音";

// 所有抖音接口统一用浏览器 UA（实测 curl UA 会被网关区别对待）
export const DOUYIN_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0";

export const DOUYIN_API_HEADERS = {
  "User-Agent": DOUYIN_UA,
  Referer: "https://www.douyin.com/",
  Origin: "https://www.douyin.com",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "zh-CN,zh;q=0.9",
} as const;

export const DOUYIN_USER_API = "https://www.douyin.com/aweme/v1/web/user/profile/other/";
export const DOUYIN_TTWID_API = "https://ttwid.bytedance.com/ttwid/union/register/";

export const DOUYIN_HOME_PREFIX = "https://www.douyin.com/user/";
export const DOUYIN_VIDEO_PREFIX = "https://www.douyin.com/video/";

// 详情/主页接口必须携带的完整浏览器环境参数（最小参数集会触发网关拦截）
export const DOUYIN_BROWSER_PARAMS = {
  device_platform: "webapp",
  aid: "6383",
  channel: "channel_pc_web",
  pc_client_type: "1",
  pc_libra_divert: "Windows",
  update_version_code: "170400",
  support_h265: "1",
  support_dash: "0",
  version_code: "290100",
  version_name: "29.1.0",
  cookie_enabled: "true",
  screen_width: "1920",
  screen_height: "1080",
  browser_language: "zh-CN",
  browser_platform: "Win32",
  browser_name: "Edge",
  browser_version: "131.0.0.0",
  browser_online: "true",
  engine_name: "Blink",
  engine_version: "131.0.0.0",
  os_name: "Windows",
  os_version: "10",
  cpu_core_num: "12",
  device_memory: "8",
  platform: "PC",
  downlink: "10",
  effective_type: "4g",
  round_trip_time: "50",
} as const;

export const DOUYIN_SHORT_HOSTS = ["v.douyin.com"] as const;
export const DOUYIN_HOSTS = [
  "douyin.com",
  "www.douyin.com",
  "iesdouyin.com",
  "www.iesdouyin.com",
] as const;
