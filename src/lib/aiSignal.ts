// 시연용 mock 7일 KRW/USD 환율 — 최신 값이 평균보다 낮아 strong 시그널 나오도록 구성
// latest=1458로 EXCHANGE_RATE_KRW_USD(config.ts)와 일치시켜 Send 페이지 환산 환율과 통일
const RATE_HISTORY_7D = [1475, 1470, 1468, 1470, 1465, 1462, 1458]

export type SignalLevel = "strong" | "good" | "neutral" | "wait" | "warning"

export type AISignal = {
  sigma: number
  level: SignalLevel
  message: string
  chartData: number[]
  latest: number
  mean: number
}

const MESSAGES: Record<SignalLevel, string> = {
  strong: "지금 송금하세요",
  good: "좋은 시점입니다",
  neutral: "평소 수준입니다",
  wait: "조금 기다려보세요",
  warning: "대기 권장",
}

function classify(sigma: number): SignalLevel {
  if (sigma >= 1) return "strong"
  if (sigma >= 0.3) return "good"
  if (sigma <= -1) return "warning"
  if (sigma <= -0.3) return "wait"
  return "neutral"
}

export function getAISignal(): AISignal {
  const data = RATE_HISTORY_7D
  const n = data.length
  const mean = data.reduce((s, v) => s + v, 0) / n
  const variance = data.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  const stdDev = Math.sqrt(variance)
  const latest = data[data.length - 1]
  const sigma = stdDev > 0 ? (mean - latest) / stdDev : 0
  const level = classify(sigma)
  return {
    sigma,
    level,
    message: MESSAGES[level],
    chartData: data,
    latest,
    mean,
  }
}
