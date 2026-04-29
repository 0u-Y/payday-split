const COUNTRY: Record<string, { name: string; short: string; color: string }> = {
    KR: { name: "한국", short: "KR", color: "#0F1F3D" },
    VN: { name: "베트남", short: "VN", color: "#C8412E" },
    PH: { name: "필리핀", short: "PH", color: "#1B4FA0" },
    TH: { name: "태국", short: "TH", color: "#5A2A82" },
  }
  
  interface FlagChipProps {
    code: string
    size?: number
  }
  
  export function FlagChip({ code, size = 22 }: FlagChipProps) {
    const c = COUNTRY[code] || { short: code, color: "#8A8E99" }
    return (
      <div
        className="rounded-full inline-flex items-center justify-center font-bold font-mono text-white"
        style={{
          width: size,
          height: size,
          background: c.color,
          fontSize: size * 0.4,
        }}
      >
        {c.short}
      </div>
    )
  }