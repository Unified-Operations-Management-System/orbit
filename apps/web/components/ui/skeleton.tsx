export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse bg-surface motion-reduce:animate-none ${className}`} />;
}
