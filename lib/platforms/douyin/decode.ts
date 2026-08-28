import "server-only";

export interface ActivityInfo {
  /** 分享时间（Unix 秒，字符串） */
  shareTime?: string;
  /** 分享时引用的作者 ID（与详情接口的 author.uid 可能不一致，勿当主键） */
  authorId?: string;
  /** 分享事件 ID */
  shareId?: string;
  /** ★ 分享者 User ID（纯数字） */
  shareUserId?: string;
}

// activity_info 是 URL 编码的 JSON（searchParams 已解码一层，这里兼容双重编码）
export function parseActivityInfo(raw: string | null | undefined): ActivityInfo | null {
  if (!raw) {
    return null;
  }

  const candidates = [raw];
  try {
    candidates.push(decodeURIComponent(raw));
  } catch {
    // 不是合法编码，只试原文
  }

  for (const candidate of candidates) {
    try {
      const obj = JSON.parse(candidate) as Record<string, unknown>;
      if (!obj || typeof obj !== "object") {
        continue;
      }
      return {
        shareTime:
          typeof obj.social_share_time === "string" ? obj.social_share_time : undefined,
        authorId: typeof obj.social_author_id === "string" ? obj.social_author_id : undefined,
        shareId: typeof obj.social_share_id === "string" ? obj.social_share_id : undefined,
        shareUserId:
          typeof obj.social_share_user_id === "string" ? obj.social_share_user_id : undefined,
      };
    } catch {
      // 尝试下一个候选
    }
  }

  return null;
}
