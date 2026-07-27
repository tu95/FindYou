import { Link2, LoaderCircle, Search } from "lucide-react";

interface LinkInputProps {
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function LinkInput({ value, loading, onChange, onSubmit }: LinkInputProps) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label
        className="flex items-center gap-2.5 text-lg font-black text-black sm:text-xl"
        htmlFor="share-link"
      >
        <span className="flex size-8 items-center justify-center border-2 border-black bg-[#F7C548] shadow-[3px_3px_0_#000]">
          <Link2 className="size-4" aria-hidden="true" />
        </span>
        分享链接
      </label>
      <textarea
        id="share-link"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="把网易云分享的链接或整段文字贴到这里"
        className="min-h-36 w-full resize-y border-[3px] border-black bg-white px-4 py-4 font-mono text-base leading-7 text-black shadow-[6px_6px_0_#000] outline-none transition placeholder:text-neutral-400 focus:shadow-[6px_6px_0_#FF8FD4] sm:min-h-44 sm:px-6 sm:py-5 sm:text-lg sm:leading-8"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-[40px] border-[3px] border-black bg-[#FF8FD4] px-6 text-xl font-black text-black shadow-[6px_6px_0_#000] transition-all hover:-translate-y-0.5 hover:shadow-[8px_8px_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:bg-neutral-300 sm:h-16 sm:text-2xl"
      >
        {loading ? (
          <LoaderCircle className="size-6 animate-spin sm:size-7" aria-hidden="true" />
        ) : (
          <Search className="size-6 sm:size-7" aria-hidden="true" />
        )}
        <span>{loading ? "查找中" : "查找"}</span>
      </button>
    </form>
  );
}
