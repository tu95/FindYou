import { ResolveError } from "@/lib/errors";
import { neteaseResolver } from "./netease";
import type { ResolveContext, ResolveResult } from "./types";

export const platformResolvers = [neteaseResolver];

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

export type { ResolveResult } from "./types";
