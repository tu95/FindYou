import { ExternalLink } from "lucide-react";
import type { ResolveResult } from "@/lib/platforms";

interface ResultViewProps {
  result: ResolveResult | null;
  error: string | null;
}

export function ResultView({ result, error }: ResultViewProps) {
  if (error) {
    return (
      <section className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <h2 className="text-base font-semibold text-red-950">没有找到</h2>
        <p className="mt-2">{error}</p>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="rounded-md border border-dashed border-neutral-300 bg-white/70 p-4 text-sm text-neutral-500">
        <h2 className="text-base font-semibold text-neutral-900">等待查找</h2>
        <p className="mt-2">找到后会在这里显示分享者信息。</p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-md border border-red-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-neutral-950">用户主页</h2>
        <a
          href={result.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all text-sm font-medium text-red-700 underline-offset-4 hover:underline"
        >
          {result.profileUrl}
        </a>
      </div>

      <div>
        <a
          href={result.profileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-medium text-white transition hover:bg-neutral-800"
          title="打开链接"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          打开链接
        </a>
      </div>
    </section>
  );
}
