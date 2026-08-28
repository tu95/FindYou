import { NextResponse } from "next/server";
import { ResolveError, getErrorMessage } from "@/lib/errors";
import { sanitizeShareLink } from "@/lib/platforms";

interface SanitizeRequest {
  url?: string;
}

async function resolveShortLink(url: string) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "manual",
    headers: {
      "user-agent": "curl/8.10.1",
    },
  });
  const location = response.headers.get("location");

  if (!location) {
    if (response.status === 404 || response.status === 410) {
      throw new ResolveError("这条分享链接已经失效了，请重新复制一条再试", 410);
    }

    throw new ResolveError("短链没有返回跳转地址", 502);
  }

  return new URL(location, url).toString();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SanitizeRequest;
    const input = body.url?.trim();

    if (!input) {
      throw new ResolveError("请先粘贴分享链接");
    }

    const result = await sanitizeShareLink(input, { resolveShortLink });

    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ResolveError ? error.status : 500;

    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      { status },
    );
  }
}
