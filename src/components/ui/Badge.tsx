import type { ReactNode } from "react"

type BadgeKind = "neutral" | "coral" | "sage" | "amber" | "red" | "ink"

interface BadgeProps {
  children: ReactNode
  kind?: BadgeKind
  className?: string
}

export function Badge({ 
  children, 
  kind = "neutral", 
  className = "" 
}: BadgeProps) {
  const kinds: Record<BadgeKind, string> = {
    neutral: "bg-bg-sunken text-ink-soft",
    coral: "bg-coral-soft text-coral-dark",
    sage: "bg-sage-soft text-sage",
    amber: "bg-amber-soft text-amber-dark",
    red: "bg-red-soft text-red",
    ink: "bg-ink text-white",
  }

  return (
    <span
      className={`
        ${kinds[kind]}
        px-2 py-0.5 rounded-full
        text-[11px] font-semibold tracking-wider
        inline-flex items-center gap-1
        ${className}
      `.trim()}
    >
      {children}
    </span>
  )
}