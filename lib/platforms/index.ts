import "server-only";
import { ResolveError } from "@/lib/errors";
import { neteaseResolver } from "./netease";
import { xiaohongshuResolver } from "./xiaohongshu";
import type { ResolveContext, ResolveResult, SanitizeResult } from "./types";

export const platformResolvers = [neteaseResolver, xiaohongshuResolver];

export async function resolveShareLink(
  input: string,
  context?: ResolveContext,
): Promise<ResolveResult> {
  const resolver = platformResolvers.find((platform) => platform.canHandle(input));

  if (!resolver) {
    throw new ResolveError("现在还不支持这个链接");
  }

  return resolver.resolve(input, context);
}

// 一键抹除分享者信息：保留内容 ID，删掉分享者参数，返回干净链接。
export async function sanitizeShareLink(
  input: string,
  context?: ResolveContext,
): Promise<SanitizeResult> {
  const resolver = platformResolvers.find((platform) => platform.canHandle(input));

  if (!resolver) {
    throw new ResolveError("现在还不支持这个链接");
  }

  return resolver.sanitize(input, context);
}

export type { ResolveResult, SanitizeResult } from "./types";
