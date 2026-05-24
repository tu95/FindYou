"use client";

import { useRef, useState } from "react";
import { Code2, Link2, Music2, Radar, ShieldCheck } from "lucide-react";
import { LinkInput } from "./link-input";
import { ResultView } from "./result-view";
import type { ResolveResult } from "@/lib/platforms";
import { absoluteUrl, siteConfig } from "@/lib/site";

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
            <p className="text-3xl font-bold tracking-normal text-neutral-950">
              {siteConfig.shortName}
            </p>
            <p className="mt-1 text-base font-medium tracking-[0.24em] text-neutral-500">
              一键追踪分享者
            </p>
          </div>
        </div>

        <div className="mb-12">
          <h1 className="text-5xl font-black leading-tight tracking-normal text-neutral-950 sm:text-6xl">
            网易云分享链接查 UID
          </h1>
          <p className="mt-5 text-xl font-medium leading-8 text-neutral-500">
            粘贴网易云音乐分享链接，解析分享者 UID，并打开对应用户主页。
          </p>
          <div className="mt-7 h-2 w-14 rounded-full bg-gradient-to-r from-red-500 to-red-300" />
        </div>

        <section className="space-y-8">
          <LinkInput value={url} loading={loading} onChange={setUrl} onSubmit={resolve} />
          <div ref={resultRef}>
            <ResultView result={result} error={error} />
          </div>
        </section>

        <section className="mt-16 space-y-5 text-neutral-700">
          <div className="rounded-3xl border border-red-100 bg-white/82 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3 text-neutral-950">
              <ShieldCheck className="size-6 text-red-500" aria-hidden="true" />
              <h2 className="text-2xl font-bold">开源、透明、少打扰</h2>
            </div>
            <p className="mt-4 text-base leading-8">
              这是一个开源的网易云音乐分享链接解析工具，目标是把分享链接里的分享者信息讲清楚，
              方便查看 UID 和用户主页。项目会尽量保持解析过程透明，也欢迎继续补充不同平台的逆向分析。
            </p>
            <a
              href={siteConfig.github}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-base font-bold text-red-600 underline-offset-4 hover:underline"
            >
              <Code2 className="size-5" aria-hidden="true" />
              查看开源仓库
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {siteConfig.faqs.map((item) => (
              <article
                key={item.question}
                className="rounded-3xl border border-red-100 bg-white/78 p-5 shadow-[0_16px_42px_rgba(15,23,42,0.045)]"
              >
                <h3 className="text-lg font-bold text-neutral-950">{item.question}</h3>
                <p className="mt-3 text-sm leading-7 text-neutral-600">{item.answer}</p>
              </article>
            ))}
          </div>

          <div className="space-y-5">
            <section className="border-t border-red-100 pt-6">
              <h2 className="text-2xl font-bold text-neutral-950">
                findYourNetEaseCloudMusic 是什么？
              </h2>
              <p className="mt-4 text-base leading-8">
                {siteConfig.summary}
              </p>
            </section>

            <section className="border-t border-red-100 pt-6">
              <h2 className="text-2xl font-bold text-neutral-950">它怎么解析分享者 UID？</h2>
              <p className="mt-4 text-base leading-8">
                页面会从你粘贴的网易云音乐分享内容里提取链接和分享参数，把这些公开参数交给解析接口处理。
                如果链接里包含可识别的分享者信息，工具会返回分享者 UID 对应的网易云音乐用户主页。
                解析逻辑放在开源仓库里，方便检查输入、输出和失败原因。
              </p>
            </section>

            <section className="border-t border-red-100 pt-6">
              <h2 className="text-2xl font-bold text-neutral-950">为什么有些链接解析失败？</h2>
              <p className="mt-4 text-base leading-8">
                常见原因包括分享文本不完整、分享参数被平台改写、链接来自暂未兼容的客户端版本，
                或者目标内容本身没有携带可解析的分享者字段。遇到失败时，可以复制完整分享文案再试，
                也可以到开源仓库提交样例，帮助补充更多平台版本的兼容逻辑。
              </p>
            </section>

            <section className="border-t border-red-100 pt-6">
              <h2 className="text-2xl font-bold text-neutral-950">机器可读入口</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  ["llms.txt", "/llms.txt"],
                  ["sitemap.xml", "/sitemap.xml"],
                  ["robots.txt", "/robots.txt"],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-full border border-red-100 bg-white/80 px-4 py-2 text-sm font-bold text-red-600 underline-offset-4 hover:underline"
                  >
                    {label}
                  </a>
                ))}
              </div>
              <p className="mt-4 text-sm leading-7 text-neutral-500">
                AI 搜索和传统爬虫可以从这些入口读取站点摘要、抓取规则和可索引页面。
                当前规范站点地址是 {absoluteUrl("/")}。
              </p>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
