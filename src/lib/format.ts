export const fmtKRW = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR")
export const fmtUSD = (n: number) => "$" + n.toFixed(2)
export const fmtPct = (n: number) => n.toFixed(1) + "%"
export const fmtRLUSD = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const shortAddr = (a: string) => 
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ""