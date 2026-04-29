export const fmtKRW = (n: number) => "₩" + Math.round(n).toLocaleString("ko-KR")
export const fmtUSD = (n: number) => "$" + n.toFixed(2)
export const fmtPct = (n: number) => n.toFixed(1) + "%"
export const shortAddr = (a: string) => 
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : ""