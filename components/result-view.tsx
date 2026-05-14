import { Check, ExternalLink, UserRound } from "lucide-react";
import type { ResolveResult } from "@/lib/platforms";

interface ResultViewProps {
  result: ResolveResult | null;
  error: string | null;
}

export function ResultView({ result, error }: ResultViewProps) {
  if (error) {
    return (
      <section className="rounded-3xl border border-red-100 bg-white/92 p-6 text-base text-red-800 shadow-[0_18px_50px_rgba(239,68,68,0.12)]">
        <h2 className="text-2xl font-bold text-red-950">没有找到</h2>
        <p className="mt-3 leading-7">{error}</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-3xl border border-dashed border-red-100 bg-white/70 p-6 text-base text-neutral-500 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
        <h2 className="text-2xl font-bold text-neutral-950">等待查找</h2>
        <p className="mt-3 leading-7">找到后会在这里显示用户主页。</p>
      </section>
    );
  }

  return (
    <section className="space-y-7 rounded-3xl border border-red-100 bg-white/92 p-7 shadow-[0_24px_70px_rgba(239,68,68,0.14)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <UserRound className="size-7" aria-hidden="true" />
          </span>
          <h2 className="text-3xl font-bold text-neutral-950">用户主页</h2>
        </div>
        <span className="flex size-14 items-center justify-center rounded-full bg-red-50 text-red-500">
          <Check className="size-7" aria-hidden="true" />
        </span>
      </div>

      <div className="border-t border-dashed border-red-100 pt-5">
        <a
          href={result.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="block break-all text-xl font-medium leading-8 text-red-600 underline-offset-4 hover:underline"
        >
          {result.profileUrl}
        </a>
      </div>

      <div>
        <a
          href={result.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-16 items-center justify-center gap-3 rounded-2xl bg-neutral-950 px-7 text-xl font-bold text-white shadow-[0_16px_34px_rgba(15,23,42,0.22)] transition hover:bg-neutral-800"
          title="打开链接"
        >
          <ExternalLink className="size-6" aria-hidden="true" />
          打开链接
        </a>
      </div>
    </section>
  );
}
