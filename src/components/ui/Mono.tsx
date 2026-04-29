import type { ReactNode, CSSProperties } from "react"

interface MonoProps {
  children: ReactNode
  size?: number
  className?: string
  style?: CSSProperties
}

export function Mono({ 
  children, 
  size = 13, 
  className = "", 
  style 
}: MonoProps) {
  return (
    <span
      className={`font-mono tabular-nums ${className}`}
      style={{ fontSize: size, ...style }}
    >
      {children}
    </span>
  )
}