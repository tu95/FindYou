import { LoaderCircle, Search } from "lucide-react";

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
      <label className="text-sm font-medium text-neutral-800" htmlFor="share-link">
        分享链接
      </label>
      <textarea
        id="share-link"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="粘贴网易云音乐分享链接"
        className="min-h-32 w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-3 text-sm leading-6 text-neutral-900 shadow-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
      />
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-400 sm:w-auto"
      >
        {loading ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Search className="size-4" aria-hidden="true" />
        )}
        {loading ? "查找中" : "查找"}
      </button>
    </form>
  );
}
