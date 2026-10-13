// Spinning ring with an optional label, for content that is still loading.
export function Spinner({ label }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-8 text-sm text-foreground/60">
      <span className="size-6 animate-spin rounded-full border-2 border-surface-hover border-t-accent" />
      {label ?? "Loading…"}
    </div>
  );
}
