import type { ButtonHTMLAttributes, ReactNode } from "react"

type ButtonKind = "primary" | "secondary" | "coral" | "ink" | "ghost"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  kind?: ButtonKind
  size?: ButtonSize
}

export function Button({
  children,
  kind = "primary",
  size = "md",
  className = "",
  ...rest
}: ButtonProps) {
  const sizes: Record<ButtonSize, string> = {
    sm: "px-3.5 py-2 text-[13px]",
    md: "px-[18px] py-[11px] text-sm",
    lg: "px-[22px] py-[14px] text-base",
  }
  
  const kinds: Record<ButtonKind, string> = {
    primary: "bg-coral text-white border border-coral hover:bg-coral-dark hover:border-coral-dark",
    coral: "bg-coral text-white border border-coral hover:bg-coral-dark hover:border-coral-dark",
    secondary: "bg-transparent text-ink border border-line hover:bg-bg-sunken",
    ink: "bg-ink text-white border border-ink hover:opacity-90",
    ghost: "bg-transparent text-ink border border-transparent hover:bg-bg-sunken",
  }

  return (
    <button
      className={`
        ${sizes[size]} ${kinds[kind]}
        rounded-[10px] font-semibold font-kr
        cursor-pointer tracking-tight
        transition-all duration-100
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${className}
      `.trim()}
      {...rest}
    >
      {children}
    </button>
  )
}