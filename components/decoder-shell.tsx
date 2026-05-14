"use client";

import { useRef, useState } from "react";
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
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-normal text-neutral-950">
          找到分享者主页
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
          粘贴网易云音乐分享链接，帮你找到是谁分享的。
        </p>
      </div>

      <section className="space-y-5">
        <LinkInput value={url} loading={loading} onChange={setUrl} onSubmit={resolve} />
        <div ref={resultRef}>
          <ResultView result={result} error={error} />
        </div>
      </section>
    </main>
  );
}
