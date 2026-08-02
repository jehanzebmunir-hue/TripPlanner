// A placeholder shaped like the real content it's standing in for, so the
// layout doesn't jump when data arrives -- previously every loading state
// in this app was a single line of "Loading…" text, then a full reflow.
// Tailwind's animate-pulse already respects prefers-reduced-motion via the
// global rule in index.css (transition/animation duration collapses to
// ~0), so this doesn't need its own reduced-motion handling.
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-sm bg-line/50 ${className}`} />;
}

export function PlaceCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 border border-line bg-paper-raised p-4">
      <div className="flex items-start justify-between gap-2.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex items-center justify-between pt-0.5">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}
