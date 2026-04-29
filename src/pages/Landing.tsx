import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Avatar, Badge, Button, Card, FlagChip, Mono } from "../components/ui"
import { FAMILY_PRESET } from "../lib/family"
import { shortAddr } from "../lib/format"

const RATE = 1358
const SALARY_KRW = 3_000_000

const DEMO_ADDRS: Record<string, string> = {
  "1": "rN3aLq9m2Xv7T8KpQwY4hRf6BzC1eVmJ8s",
  "2": "rB7kP2nW4xY8VfL6QzM3tH5cN9aD1eG7Jp",
  "3": "rH9mT4kP7Qx3VnL5BfY8WcN2aS6eG1Zd4R",
  "4": "rK2vP8nM5Qy6WxL3BfT9YcN4aS7eG2Zd1H",
}

const FAMILY = FAMILY_PRESET.map((f) => ({
  ...f,
  addr: f.addr || DEMO_ADDRS[f.id] || "",
}))

export default function Landing() {
  return (
    <div className="px-16 pt-14 pb-10">
      {/* Hero row */}
      <div className="grid grid-cols-[1.05fr_1fr] gap-14 items-center">
        <div>
          <h1 className="text-[56px] leading-[1.05] tracking-[-0.035em] font-extrabold text-ink m-0">
            월급 하나로,
            <br />
            가족 모두에게.
          </h1>
          <p className="text-[18px] leading-[1.55] text-ink-soft mt-[22px] mb-8 max-w-[460px] font-medium">
            한국에서 일하는 외국인 근로자가 본국 가족에게
            <br />
            <strong className="text-ink">한 번의 송금으로</strong> XRPL 위에서 자동 분할.
          </p>

          <div className="flex gap-3 mb-9">
            <Link to="/send">
              <Button kind="primary" size="lg">
                송금 시작 →
              </Button>
            </Link>
          </div>

          <div className="flex gap-8 pt-6 border-t border-line">
            <Stat top="$0.0001" label="건당 수수료" />
            <Stat top="3.4초" label="평균 정산" />
            <Stat top="vs SWIFT" label="98% 절감" coral />
          </div>
        </div>

        <FlowDiagram />
      </div>

      {/* How it works */}
      <div className="mt-14 pt-7 border-t border-line">
        <div className="text-[11px] font-bold tracking-[0.1em] text-ink-mute mb-[18px]">
          HOW IT WORKS
        </div>
        <div className="grid grid-cols-3 gap-[14px]">
          <HowStep
            n="01"
            title="한국 온램프"
            sub="토스뱅크 → RLUSD"
            detail="월급 KRW를 안정 코인으로 환전"
          />
          <HowStep
            n="02"
            title="XRPL 1:N 분할"
            sub="단일 트랜잭션 묶음"
            detail="가족 비율대로 자동 분배"
          />
          <HowStep
            n="03"
            title="현지 오프램프"
            sub="VND/PHP/THB e-wallet"
            detail="가족이 즉시 현지 통화로 수령"
          />
        </div>
      </div>
    </div>
  )
}

function Stat({ top, label, coral }: { top: string; label: string; coral?: boolean }) {
  return (
    <div>
      <div
        className={`text-[22px] font-bold tracking-[-0.02em] tabular-nums ${
          coral ? "text-coral" : "text-ink"
        }`}
      >
        {top}
      </div>
      <div className="text-xs text-ink-mute mt-0.5 font-medium">{label}</div>
    </div>
  )
}

function HowStep({
  n,
  title,
  sub,
  detail,
}: {
  n: string
  title: string
  sub: string
  detail: string
}) {
  return (
    <Card padded={false} className="p-[18px]">
      <div className="flex items-baseline gap-2.5 mb-2">
        <Mono size={11} className="text-coral font-bold">
          {n}
        </Mono>
        <span className="text-[15px] font-bold">{title}</span>
      </div>
      <div className="text-xs text-ink-soft font-medium mb-1.5">{sub}</div>
      <div className="text-xs text-ink-mute leading-[1.5]">{detail}</div>
    </Card>
  )
}

function FlowDiagram() {
  const [pulse, setPulse] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % 100), 60)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="bg-bg-raised border border-line rounded-[20px] p-7 shadow-lift relative min-h-[380px]">
      <div className="flex justify-between items-center mb-5">
        <Mono size={11} className="text-ink-mute tracking-[0.08em]">
          LIVE_FLOW · ledger #4_829_113
        </Mono>
        <Badge kind="sage">
          <span className="w-1.5 h-1.5 rounded-full bg-sage inline-block animate-pulse-dot" />
          active
        </Badge>
      </div>

      {/* Sender node */}
      <FlowNode label="송금인" sub="한국 · Nguyen V." amount="₩3,000,000" primary />

      {/* Trunk */}
      <div className="relative h-[72px] mt-3 mb-3 ml-[60px] flex flex-col items-start">
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-line" />
        <div
          className="absolute w-1 h-4 bg-coral rounded-[2px]"
          style={{
            left: -1,
            top: pulse * 0.7,
            boxShadow: "0 0 12px var(--color-coral)",
          }}
        />
        <div className="ml-[18px] mt-[22px] px-2.5 py-1 rounded-full bg-ink text-white text-[11px] font-semibold">
          XRPL · 2,209.13 RLUSD · 3.4s
        </div>
      </div>

      {/* Family branch */}
      <div className="relative pl-[60px]">
        <svg
          width="40"
          height={FAMILY.length * 56}
          className="absolute top-0"
          style={{ left: 40 }}
        >
          {FAMILY.map((_, i) => {
            const y = 22 + i * 56
            return (
              <path
                key={i}
                d={`M 0 0 V ${y} H 40`}
                stroke="var(--color-line)"
                strokeWidth="1.5"
                fill="none"
              />
            )
          })}
        </svg>

        <div className="flex flex-col gap-2">
          {FAMILY.map((f) => {
            const amount = ((SALARY_KRW / RATE) * f.share) / 100
            const krw = Math.round((SALARY_KRW * f.share) / 100).toLocaleString("ko-KR")
            return (
              <div
                key={f.id}
                className="flex items-center gap-2.5 px-3 py-2 bg-bg border border-line rounded-[10px] ml-4"
              >
                <Avatar name={f.label} size={28} color={f.color} />
                <div className="flex-1">
                  <div className="text-[13px] font-semibold">{f.label}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <FlagChip code={f.country} size={11} />
                    <Mono size={10} className="text-ink-mute">
                      {shortAddr(f.addr)}
                    </Mono>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold tabular-nums">
                    {amount.toFixed(2)}
                    <span className="text-[10px] text-ink-mute font-medium ml-1">RLUSD</span>
                  </div>
                  <div className="text-[10px] text-ink-mute tabular-nums">
                    ≈ ₩{krw} · {f.share}%
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function FlowNode({
  label,
  sub,
  amount,
  primary,
}: {
  label: string
  sub: string
  amount: string
  primary?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-3 rounded-[10px] border w-fit ${
        primary ? "bg-ink text-white border-ink" : "bg-bg-raised text-ink border-line"
      }`}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] ${
          primary ? "bg-white/10" : "bg-bg-sunken"
        }`}
      >
        KR
      </div>
      <div>
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-[11px] opacity-70">{sub}</div>
      </div>
      <div
        className={`pl-3.5 ml-1.5 border-l text-base font-bold tabular-nums ${
          primary ? "border-white/20" : "border-line"
        }`}
      >
        {amount}
      </div>
    </div>
  )
}
