export default function EmptyState({
  title = "No data found",
  description = "There is nothing here yet.",
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 text-[var(--os-blockquote)] animate-in-fade">
      <img
        src="/icons/candle-with-handle.png"
        alt=""
        aria-hidden="true"
        className="w-16 h-16 object-contain mb-4 opacity-80 animate-candle-flicker"
      />

      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      <p className="text-sm opacity-80">{description}</p>
    </div>
  );
}
