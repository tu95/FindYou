"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function CopyButton({
  text,
  label = "复制链接",
  icon,
}: {
  text: string;
  label?: string;
  icon?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 老浏览器降级：隐藏 textarea + execCommand
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-[3px] border-black bg-[#F7C548] px-5 font-mono text-sm font-bold text-black shadow-[4px_4px_0_#000] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:h-13 sm:text-base"
    >
      {copied ? (
        <Check className="size-4.5" aria-hidden="true" />
      ) : (
        (icon ?? <Copy className="size-4.5" aria-hidden="true" />)
      )}
      {copied ? "已复制" : label}
    </button>
  );
}

export function ShareButton({ text }: { text: string }) {
  const [supported] = useState(
    () => typeof navigator !== "undefined" && typeof navigator.share === "function",
  );

  if (!supported) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => {
        void navigator.share({ title: "干净分享链接", text }).catch(() => {});
      }}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-[3px] border-black bg-[#FF8FD4] px-5 font-mono text-sm font-bold text-black shadow-[4px_4px_0_#000] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:h-13 sm:text-base"
    >
      <Share2 className="size-4.5" aria-hidden="true" />
      分享
    </button>
  );
}
