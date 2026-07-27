"use client";

import { useRef, useState } from "react";
import { Code2, Link2, Music2, Radar, ShieldCheck } from "lucide-react";
import { LinkInput } from "./link-input";
import { ResultView } from "./result-view";
import type { ResolveResult } from "@/lib/platforms";
import { absoluteUrl, siteConfig } from "@/lib/site";

// FAQ 卡片按棋盘格交替粉黄两色
const faqCardColors = ["bg-[#F7C548]", "bg-[#FF8FD4]", "bg-[#FF8FD4]", "bg-[#F7C548]"];

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
      <div className="pointer-events-none absolute right-6 top-14 hidden rotate-12 border-2 border-black bg-[#F7C548] p-3 shadow-[4px_4px_0_#000] sm:block">
        <Music2 className="size-8" aria-hidden="true" />
      </div>
      <div className="pointer-events-none absolute right-10 top-40 hidden -rotate-6 rounded-full border-2 border-black bg-[#FF8FD4] p-3 shadow-[4px_4px_0_#000] sm:block">
        <Link2 className="size-6" aria-hidden="true" />
      </div>

      <section className="relative z-10">
        <div className="mb-10 flex items-center gap-4 sm:mb-16">
          <div className="relative flex size-14 shrink-0 items-center justify-center border-[3px] border-black bg-[#F7C548] shadow-[5px_5px_0_#000] sm:size-20">
            <Radar className="size-7 sm:size-10" aria-hidden="true" />
            <span className="absolute -right-3 -top-3 flex size-7 items-center justify-center rounded-full border-2 border-black bg-[#FF8FD4] sm:size-8">
              <Link2 className="size-3.5 sm:size-4" aria-hidden="true" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="break-words font-mono text-2xl font-bold leading-tight text-black sm:text-3xl">
              {siteConfig.shortName}
            </p>
            <p className="mt-1.5 inline-block bg-black px-2 py-0.5 font-mono text-xs font-bold tracking-[0.2em] text-[#F7C548] sm:text-sm">
              一键追踪分享者
            </p>
          </div>
        </div>

        <div className="mb-10 sm:mb-14">
          <h1 className="text-4xl font-black leading-snug tracking-tight text-black sm:text-6xl">
            网易云分享链接{" "}
            <span className="inline-block -rotate-1 border-[3px] border-black bg-[#FF8FD4] px-3 py-0.5 shadow-[5px_5px_0_#000]">
              查 UID
            </span>
          </h1>
          <p className="mt-5 text-base font-medium leading-7 text-black/70 sm:mt-6 sm:text-xl sm:leading-8">
            粘贴网易云音乐分享链接，解析分享者 UID，并打开对应用户主页。
          </p>
          <div className="mt-6 flex gap-2 sm:mt-8" aria-hidden="true">
            <span className="h-3 w-14 bg-black" />
            <span className="h-3 w-8 border-2 border-black bg-[#FF8FD4]" />
            <span className="h-3 w-8 border-2 border-black bg-[#F7C548]" />
          </div>
        </div>

        <section className="space-y-7 sm:space-y-8">
          <LinkInput value={url} loading={loading} onChange={setUrl} onSubmit={resolve} />
          <div ref={resultRef}>
            <ResultView result={result} error={error} />
          </div>
        </section>

        <section className="mt-12 space-y-6 sm:mt-16">
          <div className="rounded-[40px] border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_#F7C548] sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-black bg-[#F7C548]">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <h2 className="text-xl font-black text-black sm:text-2xl">开源、透明、少打扰</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-black/75 sm:text-base sm:leading-8">
              这是一个开源的网易云音乐分享链接解析工具，目标是把分享链接里的分享者信息讲清楚，
              方便查看 UID 和用户主页。项目会尽量保持解析过程透明，也欢迎继续补充不同平台的逆向分析。
            </p>
            <a
              href={siteConfig.github}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 border-2 border-black bg-[#FF8FD4] px-4 py-2 font-mono text-sm font-bold text-black shadow-[4px_4px_0_#000] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:text-base"
            >
              <Code2 className="size-5" aria-hidden="true" />
              查看开源仓库
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            {siteConfig.faqs.map((item, index) => (
              <article
                key={item.question}
                className={`border-[3px] border-black p-5 shadow-[5px_5px_0_#000] ${faqCardColors[index % faqCardColors.length]}`}
              >
                <h3 className="text-base font-black text-black sm:text-lg">{item.question}</h3>
                <p className="mt-2.5 text-sm leading-6 text-black/80 sm:leading-7">{item.answer}</p>
              </article>
            ))}
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
              <h2 className="text-xl font-black text-black sm:text-2xl">它怎么解析分享者 UID？</h2>
              <p className="mt-4 text-sm leading-7 text-black/75 sm:text-base sm:leading-8">
                页面会从你粘贴的网易云音乐分享内容里提取链接和分享参数，把这些公开参数交给解析接口处理。
                如果链接里包含可识别的分享者信息，工具会返回分享者 UID 对应的网易云音乐用户主页。
                解析逻辑放在开源仓库里，方便检查输入、输出和失败原因。
              </p>
            </section>

            <section className="border-t-[3px] border-black pt-6">
              <h2 className="text-xl font-black text-black sm:text-2xl">为什么有些链接解析失败？</h2>
              <p className="mt-4 text-sm leading-7 text-black/75 sm:text-base sm:leading-8">
                常见原因包括分享文本不完整、分享参数被平台改写、链接来自暂未兼容的客户端版本，
                或者目标内容本身没有携带可解析的分享者字段。遇到失败时，可以复制完整分享文案再试，
                也可以到开源仓库提交样例，帮助补充更多平台版本的兼容逻辑。
              </p>
            </section>

            <section className="border-t-[3px] border-black pt-6">
              <h2 className="text-xl font-black text-black sm:text-2xl">机器可读入口</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  ["llms.txt", "/llms.txt"],
                  ["sitemap.xml", "/sitemap.xml"],
                  ["robots.txt", "/robots.txt"],
                ].map(([label, href]) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-full border-2 border-black bg-white px-4 py-1.5 font-mono text-xs font-bold text-black shadow-[3px_3px_0_#000] transition-all hover:-translate-y-0.5 hover:bg-[#F7C548] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:text-sm"
                  >
                    {label}
                  </a>
                ))}
              </div>
              <p className="mt-4 font-mono text-xs leading-6 text-black/60 sm:text-sm">
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
