"use client";

import { useRef, useState } from "react";
import { Link2, Music2, Radar, ShieldCheck } from "lucide-react";
import { LinkInput } from "./link-input";
import { ResultView } from "./result-view";
import type { ResolveResult } from "@/lib/platforms";
import { absoluteUrl, siteConfig } from "@/lib/site";

// 手绘感波浪线（黑色实线，圆头），孟菲斯剪贴画装饰
function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 8 Q 13.5 -2 25 8 T 48 8 T 71 8 T 94 8 T 117 8 T 140 8"
        stroke="#000"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
    <main className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col overflow-hidden px-5 py-8 sm:px-8 sm:py-12 lg:px-10">
      {/* 贴纸装饰：位于内容层之下，只在有富余空间的屏幕出现 */}
      <div className="pointer-events-none absolute right-6 top-14 hidden rotate-12 border-[3px] border-black bg-sun p-3 shadow-[4px_4px_0_#000] sm:block">
        <Music2 className="size-8" aria-hidden="true" />
      </div>
      <div className="pointer-events-none absolute right-10 top-40 hidden -rotate-6 rounded-full border-[3px] border-black bg-candy p-3 shadow-[4px_4px_0_#000] sm:block">
        <Link2 className="size-6" aria-hidden="true" />
      </div>

      <section className="relative z-10">
        <div className="mb-10 flex items-center gap-4 sm:mb-16">
          <div className="relative flex size-14 shrink-0 items-center justify-center border-[3px] border-black bg-sun shadow-[5px_5px_0_#000] sm:size-20">
            <Radar className="size-7 sm:size-10" aria-hidden="true" />
            <span className="absolute -right-3 -top-3 flex size-7 items-center justify-center rounded-full border-[3px] border-black bg-tomato sm:size-8">
              <Link2 className="size-3.5 sm:size-4" aria-hidden="true" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="break-words font-mono text-2xl font-bold leading-tight text-black sm:text-3xl">
              {siteConfig.shortName}
            </p>
            <p className="mt-1.5 inline-block rounded-full bg-black px-3 py-0.5 font-mono text-xs font-bold tracking-[0.2em] text-sun sm:text-sm">
              一键找到分享的人
            </p>
          </div>
        </div>

        <div className="mb-10 sm:mb-14">
          <h1 className="text-4xl font-black leading-snug tracking-tight text-black sm:text-6xl">
            分享链接{" "}
            <span className="inline-block -rotate-1 rounded-full border-[3px] border-black bg-candy px-4 py-0.5 shadow-[5px_5px_0_#000]">
              是谁发的？
            </span>
          </h1>
          <p className="mt-5 text-base font-medium leading-7 text-black/70 sm:mt-6 sm:text-xl sm:leading-8">
            支持网易云音乐、小红书、抖音：把分享链接或整段分享文字粘贴进来，马上查出是谁分享的，一键打开对方主页。
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 sm:mt-8" aria-hidden="true">
            <Squiggle className="h-4 w-32 sm:w-40" />
            <span className="size-3.5 rounded-full border-[3px] border-black bg-sun" />
            <span className="size-3.5 rounded-full border-[3px] border-black bg-lagoon" />
            <span className="size-3.5 rounded-full border-[3px] border-black bg-tomato" />
          </div>
        </div>

        <section className="space-y-7 sm:space-y-8">
          <LinkInput value={url} loading={loading} onChange={setUrl} onSubmit={resolve} />
          <div ref={resultRef}>
            <ResultView result={result} error={error} />
          </div>
        </section>

        <section className="mt-12 space-y-6 sm:mt-16">
          <div className="border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_#00CED1] sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-[3px] border-black bg-lagoon">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-black text-black sm:text-2xl">免费、不存记录</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-black/75 sm:text-base sm:leading-8">
              这个工具完全免费，你贴进来的链接只用来查这一次，不会被保存。
            </p>
          </div>

          <div className="space-y-6">
            <section className="border-t-[3px] border-black pt-6">
              <h2 className="text-xl font-black text-black sm:text-2xl">
                FindYou 是什么？
              </h2>
              <p className="mt-4 text-sm leading-7 text-black/75 sm:text-base sm:leading-8">
                {siteConfig.summary}
              </p>
            </section>

            <section className="border-t-[3px] border-black pt-6">
              <h2 className="text-xl font-black text-black sm:text-2xl">为什么有时候查不到？</h2>
              <p className="mt-4 text-sm leading-7 text-black/75 sm:text-base sm:leading-8">
                多半是分享内容复制得不完整，或者这条链接本身没带分享者信息
                （比如网页版的小红书笔记链接只有笔记 ID）。
                回到 App 重新点分享、复制整段内容再试一次，大多数情况就能查到了。
              </p>
            </section>

            <footer className="border-t-[3px] border-black pt-6">
              <div className="flex flex-wrap items-center gap-3">
                {[
                  ["llms.txt", "/llms.txt"],
                  ["sitemap.xml", "/sitemap.xml"],
                  ["robots.txt", "/robots.txt"],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-full border-[3px] border-black bg-white px-4 py-1.5 font-mono text-xs font-bold text-black shadow-[3px_3px_0_#000] transition-all hover:-translate-y-0.5 hover:bg-sun focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:text-sm"
                  >
                    {label}
                  </a>
                ))}
              </div>
              <p className="mt-3 font-mono text-xs leading-6 text-black/50">
                上面这些是给搜索引擎和 AI 看的，普通用户不用管。{absoluteUrl("/")}
              </p>
              <p className="mt-2 font-mono text-xs leading-6 text-black/60">
                UI 风格参考{" "}
                <a
                  href="https://design-vibes.v2ai.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-black underline decoration-candy decoration-2 underline-offset-4 transition-colors hover:decoration-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black"
                >
                  Design Vibes · 网页设计风格大全
                </a>
                ，感谢提供设计灵感。
              </p>
            </footer>
          </div>
        </section>
      </section>
    </main>
  );
}
