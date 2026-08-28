import "server-only";
import { ResolveError } from "@/lib/errors";
import { XHS_SHARE_RED_ID_KEY } from "./constants";

// shareRedId 编解码（纯本地，无网络请求）：
//   编码: appuid → 转大写 → 逐字符 + 密钥数字 → Base64(URL_SAFE, NO_PADDING)
//   解码: shareRedId → Base64(URL_SAFE) 解码 → 逐字符 - 密钥数字 → 转小写 → appuid
const XHS_USER_ID_PATTERN = /^[0-9a-f]{24}$/;

export function decodeShareRedId(shareRedId: string): string {
  // 编码端输出无 padding，解码前按 len % 4 补齐。
  // 注意 JS 取模与 Python 不同（-14 % 4 = -2），这里保证结果是非负数。
  const padding = "=".repeat((4 - (shareRedId.length % 4)) % 4);
  const raw = Buffer.from(`${shareRedId}${padding}`, "base64url").toString("utf-8");

  // 长度对不上密钥说明不是这套算法编码的，别硬解
  if (raw.length !== XHS_SHARE_RED_ID_KEY.length) {
    throw new ResolveError("链接里的分享者信息没法解析");
  }

  let userId = "";
  for (let index = 0; index < raw.length; index += 1) {
    userId += String.fromCharCode(
      raw.charCodeAt(index) - Number(XHS_SHARE_RED_ID_KEY[index]),
    );
  }
  userId = userId.toLowerCase();

  if (!XHS_USER_ID_PATTERN.test(userId)) {
    throw new ResolveError("链接里的分享者信息没法解析");
  }

  return userId;
}

export function encodeShareRedId(userId: string): string {
  const upper = userId.toUpperCase();
  let shifted = "";
  for (let index = 0; index < upper.length; index += 1) {
    shifted += String.fromCharCode(
      upper.charCodeAt(index) + Number(XHS_SHARE_RED_ID_KEY[index]),
    );
  }
  return Buffer.from(shifted, "utf-8").toString("base64url");
}
