import { Check, ExternalLink, ShieldCheck, UserRound } from "lucide-react";
import type { ResolveResult } from "@/lib/platforms";
import { CopyButton } from "./clipboard-actions";

interface ResultViewProps {
  result: ResolveResult | null;
  error: string | null;
}

function formatShareTime(seconds?: number) {
  if (!seconds) {
    return "";
  }

  return new Date(seconds * 1000).toLocaleString("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const OPEN_CONTENT_LABEL: Record<string, string> = {
  douyin: "打开视频",
};

function DetailRows({ result }: { result: ResolveResult }) {
  const rows: Array<[string, React.ReactNode]> = [];

  rows.push([
    "分享者 ID",
    result.userId ?? (
      <span className="text-black/60">
        {result.platformId === "douyin"
          ? "—（这条抖音分享链接不含分享者信息，只能获取视频作者）"
          : "—（网页/PC 分享链接不含 shareRedId/appuid，无法获取）"}
      </span>
    ),
  ]);

  if (result.shareTime) {
    rows.push(["分享时间", formatShareTime(result.shareTime)]);
  }

  return (
    <dl className="border-t-[3px] border-dashed border-black pt-4 sm:pt-5">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex flex-wrap items-baseline gap-x-3 border-b-2 border-dashed border-black/15 py-2 last:border-b-0"
        >
          <dt className="w-24 shrink-0 font-mono text-xs font-bold tracking-widest text-black/60">
            {label}
          </dt>
          <dd className="min-w-0 break-all font-mono text-sm font-bold leading-6 text-black sm:text-base">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ResultView({ result, error }: ResultViewProps) {
  if (error) {
    return (
      <section className="border-[3px] border-black bg-tomato p-5 shadow-[6px_6px_0_#000] sm:p-6">
        <h2 className="inline-block rounded-full bg-black px-3 py-0.5 text-xl font-black text-cream sm:text-2xl">
          没有找到
        </h2>
        <p className="mt-3 text-sm font-bold leading-6 text-black sm:text-base sm:leading-7">
          {error}
        </p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="border-[3px] border-dashed border-black bg-white/60 p-5 sm:p-6">
        <h2 className="font-mono text-lg font-bold text-black sm:text-xl">等待查找…</h2>
        <p className="mt-2 text-sm leading-6 text-black/60 sm:text-base sm:leading-7">
          把链接贴到上面，点“查找”，结果就会出现在这里。
        </p>
      </section>
    );
  }

  // 网页版/PC 分享等：链接不携带分享者信息，是"干净的链接"，绿松石确认而非警告
  if (!result.userId) {
    return (
      <section className="space-y-5 border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_#00CED1] sm:space-y-6 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-[3px] border-black bg-lagoon sm:size-14">
              <ShieldCheck className="size-5 sm:size-7" aria-hidden="true" />
            </span>
            <h2 className="text-2xl font-black text-black sm:text-3xl">链接是干净的</h2>
            <span className="inline-block shrink-0 rounded-full border-[3px] border-black bg-white px-2.5 py-0.5 font-mono text-xs font-bold text-black sm:text-sm">
              {result.platform}
            </span>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-[3px] border-black bg-sun shadow-[3px_3px_0_#000] sm:size-14">
            <Check className="size-5 sm:size-7" aria-hidden="true" />
          </span>
        </div>

        <div className="border-[3px] border-black bg-lagoon p-4 sm:p-5">
          <p className="text-lg font-black leading-6 text-black sm:text-xl">
            ✅ 这条链接很干净，可以直接放心转发
          </p>
          <p className="mt-2 text-sm leading-6 text-black/80 sm:text-base sm:leading-7">
            {result.shareUserIdReason ?? "这条链接没有携带分享者信息。"}
          </p>
        </div>


        <div className="flex flex-wrap gap-3">
          <a
            href={result.targetUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full border-[3px] border-black bg-black px-6 text-lg font-black text-white shadow-[5px_5px_0_#00CED1] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#00CED1] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black active:translate-x-1 active:translate-y-1 active:shadow-none sm:h-16 sm:w-auto sm:px-8 sm:text-xl"
            title={OPEN_CONTENT_LABEL[result.platformId] ?? "打开笔记"}
          >
            <ExternalLink className="size-5 sm:size-6" aria-hidden="true" />
            {OPEN_CONTENT_LABEL[result.platformId] ?? "打开笔记"}
          </a>
          <CopyButton
            text={result.cleanUrl ?? result.targetUrl}
            label="复制脱敏链接"
            icon={<span aria-hidden="true">🔗</span>}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5 border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_#FF69B4] sm:space-y-6 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-[3px] border-black bg-candy sm:size-14">
            <UserRound className="size-5 sm:size-7" aria-hidden="true" />
          </span>
          <h2 className="text-2xl font-black text-black sm:text-3xl">找到了！</h2>
          <span className="inline-block shrink-0 rounded-full border-[3px] border-black bg-white px-2.5 py-0.5 font-mono text-xs font-bold text-black sm:text-sm">
            {result.platform}
          </span>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-[3px] border-black bg-lagoon shadow-[3px_3px_0_#000] sm:size-14">
          <Check className="size-5 sm:size-7" aria-hidden="true" />
        </span>
      </div>

      <DetailRows result={result} />

      <div className="border-t-[3px] border-dashed border-black pt-4 sm:pt-5">
        <p className="font-mono text-xs font-bold tracking-widest text-black/60">
          {result.linkType === "user_profile" ? "用户主页" : "分享者主页"}
        </p>
        {result.profileUrl ? (
          <a
            href={result.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 block break-all font-mono text-sm font-bold leading-6 text-black underline decoration-[#FF69B4] decoration-[3px] underline-offset-4 hover:decoration-black focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black sm:text-lg sm:leading-8"
          >
            {result.profileUrl}
          </a>
        ) : null}
      </div>


      {result.profileUrl ? (
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={result.profileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border-[3px] border-black bg-black px-4 text-xs font-bold text-white shadow-[3px_3px_0_#FFD700] transition-all hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#FFD700] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:h-10 sm:px-5 sm:text-sm"
            title="打开分享者主页"
          >
            <ExternalLink className="size-3.5 sm:size-4" aria-hidden="true" />
            打开分享者主页
          </a>
          <CopyButton
            text={result.cleanUrl ?? result.targetUrl}
            label="复制脱敏链接"
            icon={<span aria-hidden="true">🔗</span>}
          />
        </div>
      ) : null}
    </section>
  );
}
