export type ResolveSource =
  | "userid"
  | "uct"
  | "uct2-mobile"
  | "uct2-pc"
  | "shortlink";

export interface ResolveContext {
  resolveShortLink?: (url: string) => Promise<string>;
}

export interface ResolveResult {
  platform: string;
  platformId: string;
  userId: string;
  profileUrl: string;
  source: ResolveSource;
  algorithm: string;
  targetUrl: string;
}

export interface PlatformResolver {
  id: string;
  label: string;
  canHandle(input: string): boolean;
  resolve(input: string, context?: ResolveContext): Promise<ResolveResult>;
}
