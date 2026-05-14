"use client";

import { useRef, useState } from "react";
import { Link2, Music2, Radar } from "lucide-react";
import { LinkInput } from "./link-input";
import { ResultView } from "./result-view";
import type { ResolveResult } from "@/lib/platforms";

export function DecoderShell() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ResolveResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  async function resolve() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/resolve", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "没找到分享者，请检查链接后再试");
      }

      setResult(payload);
      requestAnimationFrame(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } catch (resolveError) {
      setResult(null);
      setError(resolveError instanceof Error ? resolveError.message : "没找到分享者，请检查链接后再试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="pointer-events-none absolute right-5 top-16 hidden text-red-200/70 sm:block">
        <Music2 className="size-12 rotate-12" aria-hidden="true" />
      </div>
      <div className="pointer-events-none absolute right-10 top-36 hidden rounded-full bg-red-100/60 p-8 text-red-300/70 sm:block">
        <Link2 className="size-9 rotate-[-18deg]" aria-hidden="true" />
      </div>

      <section className="relative z-10">
        <div className="mb-16 flex items-center gap-4">
          <div className="relative flex size-20 items-center justify-center rounded-full border-4 border-red-500 text-red-500 shadow-[0_14px_34px_rgba(239,68,68,0.18)]">
            <Radar className="size-10" aria-hidden="true" />
            <span className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full border-3 border-red-400 bg-white">
              <Link2 className="size-4" aria-hidden="true" />
            </span>
          </div>
          <div>
            <p className="text-3xl font-bold tracking-normal text-neutral-950">分享者雷达</p>
            <p className="mt-1 text-base font-medium tracking-[0.24em] text-neutral-500">
              一键追踪分享者
            </p>
          </div>
        </div>

        <div className="mb-12">
          <h1 className="text-5xl font-black leading-tight tracking-normal text-neutral-950 sm:text-6xl">
            找到分享者主页
          </h1>
          <p className="mt-5 text-xl font-medium leading-8 text-neutral-500">
            粘贴网易云音乐分享链接，帮你找到是谁分享的。
          </p>
          <div className="mt-7 h-2 w-14 rounded-full bg-gradient-to-r from-red-500 to-red-300" />
        </div>

        <section className="space-y-8">
          <LinkInput value={url} loading={loading} onChange={setUrl} onSubmit={resolve} />
          <div ref={resultRef}>
            <ResultView result={result} error={error} />
          </div>
        </section>
      </section>
    </main>
  );
}
