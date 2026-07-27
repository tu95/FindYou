import { Check, ExternalLink, UserRound } from "lucide-react";
import type { ResolveResult } from "@/lib/platforms";

interface ResultViewProps {
  result: ResolveResult | null;
  error: string | null;
}

export function ResultView({ result, error }: ResultViewProps) {
  if (error) {
    return (
      <section className="border-[3px] border-black bg-[#F7C548] p-5 shadow-[6px_6px_0_#000] sm:p-6">
        <h2 className="inline-block bg-black px-2.5 py-0.5 text-xl font-black text-[#F7C548] sm:text-2xl">
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

  return (
    <section className="space-y-5 rounded-[40px] border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_#FF8FD4] sm:space-y-6 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-black bg-[#FF8FD4] sm:size-14">
            <UserRound className="size-5 sm:size-7" aria-hidden="true" />
          </span>
          <h2 className="text-2xl font-black text-black sm:text-3xl">找到了！</h2>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center border-2 border-black bg-[#F7C548] shadow-[3px_3px_0_#000] sm:size-14">
          <Check className="size-5 sm:size-7" aria-hidden="true" />
        </span>
      </div>

      <div className="border-t-[3px] border-dashed border-black pt-4 sm:pt-5">
        <a
          href={result.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="block break-all font-mono text-sm font-bold leading-6 text-black underline decoration-[#FF8FD4] decoration-[3px] underline-offset-4 hover:decoration-black sm:text-lg sm:leading-8"
        >
          {result.profileUrl}
        </a>
      </div>

      <div>
        <a
          href={result.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-[40px] border-[3px] border-black bg-black px-6 text-lg font-black text-white shadow-[5px_5px_0_#F7C548] transition-all hover:-translate-y-0.5 hover:shadow-[7px_7px_0_#F7C548] active:translate-x-1 active:translate-y-1 active:shadow-none sm:h-16 sm:w-auto sm:px-8 sm:text-xl"
          title="打开对方的网易云主页"
        >
          <ExternalLink className="size-5 sm:size-6" aria-hidden="true" />
          打开对方的主页
        </a>
      </div>
    </section>
  );
}
