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
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label
        className="flex items-center gap-2 text-xl font-bold text-neutral-950"
        htmlFor="share-link"
      >
        <Link2 className="size-6 text-red-500" aria-hidden="true" />
        分享链接
      </label>
      <textarea
        id="share-link"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="粘贴网易云音乐分享链接"
        className="min-h-48 w-full resize-y rounded-3xl border border-red-100 bg-white/92 px-6 py-5 text-lg leading-9 text-neutral-950 shadow-[0_18px_50px_rgba(15,23,42,0.08)] outline-none transition placeholder:text-neutral-400 focus:border-red-300 focus:ring-4 focus:ring-red-100"
      />
      <button
        type="submit"
        disabled={loading}
        className="group relative inline-flex h-20 w-full items-center justify-center gap-4 overflow-hidden rounded-[2rem] bg-gradient-to-r from-red-500 via-red-600 to-red-500 px-6 text-3xl font-bold text-white shadow-[0_20px_45px_rgba(239,68,68,0.28)] transition hover:scale-[1.01] hover:shadow-[0_24px_55px_rgba(239,68,68,0.34)] disabled:cursor-not-allowed disabled:from-neutral-400 disabled:to-neutral-400"
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.4),transparent_18%),radial-gradient(circle_at_82%_65%,rgba(255,255,255,0.28),transparent_16%)] opacity-70" />
        {loading ? (
          <LoaderCircle className="relative size-9 animate-spin" aria-hidden="true" />
        ) : (
          <Search className="relative size-9" aria-hidden="true" />
        )}
        <span className="relative">{loading ? "查找中" : "查找"}</span>
      </button>
    </form>
  );
}
