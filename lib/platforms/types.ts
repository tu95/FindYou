export type ResolveSource =
  | "userid"
  | "uct"
  | "uct2-mobile"
  | "uct2-pc"
  | "shortlink"
  | "shareRedId"
  | "appuid"
  | "web_share"
  | "user_profile"
  | "activity_info"
  | "uid"
  | "sec_uid"
  | "aweme_id"
  | "video";

export interface ResolveContext {
  resolveShortLink?: (url: string) => Promise<string>;
}

export interface ResolveResult {
  platform: string;
  platformId: string;
  /** 分享者 ID；网页版分享等场景拿不到时为 undefined */
  userId?: string;
  profileUrl?: string;
  source: ResolveSource;
  algorithm: string;
  targetUrl: string;
  noteId?: string;
  /** 小红书链接类型：short_link / user_profile / app_share_encrypted / app_share_plain / web_share / other */
  linkType?: string;
  /** 分享时间（Unix 秒） */
  shareTime?: number;
  /** 分享渠道，如 WeixinSession / pc_web */
  shareChannel?: string;
  /** 分享事件 ID */
  shareEventId?: string;
  xsecToken?: string;
  appVersion?: string;
  /** 输入形态：full_url / short_url / share_text */
  sourceType?: string;
  /** 拿不到分享者 ID 时的原因（web_share 等场景） */
  shareUserIdReason?: string;
  /** 脱敏链接：抹掉分享者参数（shareRedId/appuid）后可直接转发的干净链接 */
  cleanUrl?: string;
}

export interface SanitizeResult {
  platform: string;
  platformId: string;
  /** 抹除分享者信息后的干净链接 */
  cleanUrl: string;
  /** 这条链接是否携带分享者信息 */
  hadSharerInfo: boolean;
  /** 被抹除的分享者参数名列表 */
  removedParams: string[];
  /** 识别出的分享者 UID（携带分享者信息时才有） */
  userId?: string;
  /** 分享者主页链接 */
  profileUrl?: string;
  source?: ResolveSource;
  /** 被分享的内容 ID（如歌曲、笔记 ID），抹除后保留 */
  noteId?: string;
  /** 是否经由短链跳转解析 */
  fromShortLink?: boolean;
}

export interface PlatformResolver {
  id: string;
  label: string;
  canHandle(input: string): boolean;
  resolve(input: string, context?: ResolveContext): Promise<ResolveResult>;
  sanitize(input: string, context?: ResolveContext): Promise<SanitizeResult>;
}
