import type { ReactNode, HTMLAttributes } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
  raised?: boolean
}

export function Card({ 
  children, 
  padded = true, 
  raised = true, 
  className = "", 
  ...rest 
}: CardProps) {
  return (
    <div
      className={`
        ${raised ? "bg-bg-raised" : "bg-transparent"}
        border border-line rounded-[14px]
        ${padded ? "p-5" : "p-0"}
        ${className}
      `.trim()}
      {...rest}
    >
      {children}
    </div>
  )
}