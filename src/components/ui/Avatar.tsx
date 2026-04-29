interface AvatarProps {
    name: string
    size?: number
    color?: string
  }
  
  export function Avatar({ name, size = 36, color }: AvatarProps) {
    const initial = (name || "?").slice(0, 1)
    return (
      <div
        className="rounded-full inline-flex items-center justify-center font-bold flex-shrink-0"
        style={{
          width: size,
          height: size,
          background: color || "var(--color-bg-sunken)",
          color: color ? "#fff" : "var(--color-ink)",
          fontSize: size * 0.42,
        }}
      >
        {initial}
      </div>
    )
  }