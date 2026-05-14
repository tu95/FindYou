import { NextResponse } from "next/server";
import { ResolveError, getErrorMessage } from "@/lib/errors";
import { resolveShareLink } from "@/lib/platforms";

interface ResolveRequest {
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
    throw new ResolveError("短链没有返回跳转地址", 502);
  }

  return new URL(location, url).toString();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResolveRequest;
    const input = body.url?.trim();

    if (!input) {
      throw new ResolveError("请先粘贴分享链接");
    }

    const result = await resolveShareLink(input, { resolveShortLink });

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
