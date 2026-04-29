import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSender } from "../contexts/SenderContext"
import { getFamilies, addFamily, updateFamily } from "../services/storage"
import { getClient } from "../xrpl/client"
import { createFundedWallet } from "../xrpl/wallet"
import { setRLUSDTrustLine } from "../xrpl/trustline"
import { getRLUSDBalance } from "../xrpl/query"
import type { Family } from "../types"
import { Avatar, Badge, Button, Card, FlagChip, Mono } from "../components/ui"
import { FAMILY_PRESET } from "../lib/family"
import { fmtKRW, shortAddr } from "../lib/format"

const PRESET_FAMILIES = [
  { label: "어머니", country: "VN", sharePercent: 40 },
  { label: "아버지", country: "VN", sharePercent: 30 },
  { label: "남동생", country: "VN", sharePercent: 15 },
  { label: "여동생", country: "VN", sharePercent: 15 },
]

const EXCHANGE_RATE = 1458
const SWIFT_SAVINGS_KRW = 117_600
const MIN_RLUSD = 1

const colorFor = (label: string) =>
  FAMILY_PRESET.find((p) => p.label === label)?.color ?? "#1A2540"

export default function Send() {
  const navigate = useNavigate()
  const { address, isReady, isFirstTime } = useSender()

  const [families, setFamilies] = useState<Family[]>([])
  const [setupStep, setSetupStep] = useState<string>("")
  const [salaryKRW, setSalaryKRW] = useState<number>(3_000_000)
  const [balance, setBalance] = useState<number | null>(null)
  const setupStartedRef = useRef(false)

  // 가족 셋업
  useEffect(() => {
    if (!isReady) return
    if (setupStartedRef.current) return
    setupStartedRef.current = true

    ;(async () => {
      const existing = getFamilies()
      if (existing.length >= PRESET_FAMILIES.length) {
        setFamilies(existing)
        return
      }

      setSetupStep("가족 4명 셋업 중...")
      const client = await getClient()

      try {
        for (let i = 0; i < PRESET_FAMILIES.length; i++) {
          const preset = PRESET_FAMILIES[i]
          if (existing.find((f) => f.label === preset.label)) continue

          setSetupStep(
            `${preset.label} 지갑 생성 중... (${i + 1}/${PRESET_FAMILIES.length})`,
          )
          const wallet = await createFundedWallet(client)
          await setRLUSDTrustLine(client, wallet)

          const family: Family = {
            id: crypto.randomUUID(),
            label: preset.label,
            walletAddress: wallet.address,
            walletSeed: wallet.seed!,
            sharePercent: preset.sharePercent,
            country: preset.country,
            registeredAt: Date.now(),
          }
          addFamily(family)
        }

        setFamilies(getFamilies())
        setSetupStep("")
      } finally {
        await client.disconnect()
      }
    })()
  }, [isReady])

  // 잔고 조회
  useEffect(() => {
    if (!isReady || !address || setupStep) return

    ;(async () => {
      const client = await getClient()
      try {
        const bal = await getRLUSDBalance(client, address)
        setBalance(bal)
      } catch (err) {
        console.error("잔고 조회 실패:", err)
      } finally {
        await client.disconnect()
      }
    })()
  }, [isReady, address, setupStep, families.length])

  if (isFirstTime && !isReady) {
    return <SetupScreen title="데모 계정 준비 중" sub="XRPL Testnet 지갑 생성 + 초기 잔고 충전 (10~15초)" />
  }

  if (setupStep) {
    return <SetupScreen title="가족 셋업 중" sub={setupStep} note="최초 1회만 진행됩니다 (약 1분)" />
  }

  const rlusd = salaryKRW / EXCHANGE_RATE
  const totalShare = families.reduce((sum, f) => sum + f.sharePercent, 0)

  const updateShare = (id: string, raw: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(raw) ? 0 : raw))
    setFamilies((prev) =>
      prev.map((f) => (f.id === id ? { ...f, sharePercent: clamped } : f)),
    )
    updateFamily(id, { sharePercent: clamped })
  }
  const insufficientBalance = balance !== null && balance < rlusd
  const isLoading = !isReady || balance === null

  const canSend =
    !!address &&
    families.length >= PRESET_FAMILIES.length &&
    Math.abs(totalShare - 100) < 0.01 &&
    !insufficientBalance &&
    !isLoading &&
    rlusd >= MIN_RLUSD

  return (
    <div className="px-14 py-8 grid grid-cols-[1.3fr_1fr] gap-7">
      {/* LEFT */}
      <div>
        <div className="mb-5">
          <Mono size={11} className="text-ink-mute tracking-[0.08em]">
            STEP 01
          </Mono>
          <h2 className="text-[26px] font-bold mt-1 mb-1 tracking-[-0.02em]">이번 달 송금</h2>
          <div className="text-[13px] text-ink-soft">월급을 가족 4명에게 비율대로 분할합니다</div>
        </div>

        {/* Salary input */}
        <Card padded={false} className="p-6 mb-4">
          <label className="block text-xs text-ink-mute font-semibold mb-2">
            월급 (KRW)
          </label>
          <div className="flex items-baseline gap-1.5 mb-4">
            <span className="text-[28px] text-ink-mute font-semibold">₩</span>
            <input
              type="text"
              inputMode="numeric"
              value={salaryKRW === 0 ? "" : salaryKRW.toLocaleString("ko-KR")}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^0-9]/g, "")
                setSalaryKRW(digits ? parseInt(digits, 10) : 0)
              }}
              placeholder="0"
              className="flex-1 min-w-0 p-0 bg-transparent border-0 outline-none text-[44px] font-bold tracking-[-0.03em] tabular-nums font-kr text-ink placeholder:text-ink-faint"
            />
          </div>
          <div className="px-3.5 py-3 bg-bg-sunken rounded-[10px] flex justify-between items-center">
            <div className="text-xs text-ink-soft">환산 후</div>
            <div className="flex items-baseline gap-1.5">
              <Mono size={18} className="font-bold text-ink">
                {rlusd.toFixed(2)}
              </Mono>
              <span className="text-[11px] text-ink-mute font-semibold">RLUSD</span>
              <span className="text-[11px] text-ink-mute ml-2">1 USD = ₩{EXCHANGE_RATE}</span>
            </div>
          </div>
        </Card>

        {/* AI rate signal */}
        <Card padded={false} className="mb-4 overflow-hidden border-coral">
          <div className="px-[22px] py-[18px] bg-coral-soft">
            <div className="flex justify-between items-start">
              <div>
                <Badge kind="coral" className="mb-2">
                  AI 환율 시그널
                </Badge>
                <div className="text-[22px] font-bold text-coral-dark tracking-[-0.02em]">
                  지금 송금하세요
                </div>
                <div className="text-[13px] text-ink-soft mt-1">
                  KRW/USD 단기 강세 예측 · 3일 뒤 약 ₩42,000 손해 가능
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-ink-mute font-semibold">예상 절약</div>
                <div className="text-[22px] font-bold text-coral-dark tabular-nums">+₩42K</div>
              </div>
            </div>
          </div>
          <MiniRateChart />
        </Card>

        {/* Family list */}
        <Card padded={false}>
          <div className="px-5 py-3.5 border-b border-line-soft flex justify-between items-center">
            <div className="text-sm font-bold">가족 4명 · 비율 분할</div>
            <Badge kind={Math.abs(totalShare - 100) < 0.01 ? "sage" : "amber"}>
              합계 {totalShare}%
            </Badge>
          </div>
          {families.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-mute">
              가족 정보 불러오는 중…
            </div>
          ) : (
            families.map((f, i) => {
              const amt = (rlusd * f.sharePercent) / 100
              const color = colorFor(f.label)
              return (
                <div
                  key={f.id}
                  className={`px-5 py-3 flex items-center gap-3.5 ${
                    i < families.length - 1 ? "border-b border-line-soft" : ""
                  }`}
                >
                  <Avatar name={f.label} size={36} color={color} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{f.label}</div>
                    <div className="text-[11px] text-ink-mute flex items-center gap-1.5 mt-0.5">
                      <FlagChip code={f.country} size={12} />
                      <Mono size={11}>{shortAddr(f.walletAddress)}</Mono>
                    </div>
                  </div>
                  <div className="w-[140px]">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={f.sharePercent}
                      onChange={(e) =>
                        updateShare(f.id, parseInt(e.target.value, 10))
                      }
                      className="w-full h-1 rounded-[2px] appearance-none bg-bg-sunken cursor-pointer accent-coral"
                      style={{
                        background: `linear-gradient(to right, ${color} 0%, ${color} ${f.sharePercent}%, var(--color-bg-sunken) ${f.sharePercent}%, var(--color-bg-sunken) 100%)`,
                      }}
                    />
                  </div>
                  <div className="w-[60px] text-right flex items-baseline justify-end gap-0.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={f.sharePercent}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/[^0-9]/g, "")
                        updateShare(f.id, digits === "" ? 0 : parseInt(digits, 10))
                      }}
                      className="w-9 text-right text-sm font-bold tabular-nums bg-transparent border-0 outline-none rounded px-1 hover:bg-bg-sunken focus:bg-bg-sunken font-kr"
                    />
                    <span className="text-sm font-bold">%</span>
                  </div>
                  <div className="w-[90px] text-right">
                    <Mono size={13} className="font-bold">
                      {amt.toFixed(2)}
                    </Mono>
                    <div className="text-[10px] text-ink-mute font-semibold">RLUSD</div>
                  </div>
                </div>
              )
            })
          )}
        </Card>
      </div>

      {/* RIGHT — summary */}
      <div>
        <Card padded={false} className="p-6 sticky top-[76px]">
          <div className="text-xs text-ink-mute font-bold tracking-[0.06em] mb-3.5">송금 요약</div>

          <SummaryRow label="총 보낼 금액" value={fmtKRW(salaryKRW)} bold />
          <SummaryRow label="환산" value={`${rlusd.toFixed(2)} RLUSD`} mono />
          <SummaryRow label="수신인" value="가족 4명 · 베트남" />

          <div className="h-px bg-line my-3.5" />

          <div className="flex justify-between mb-1.5">
            <span className="text-xs text-ink-mute">XRPL 네트워크 수수료</span>
            <Mono size={12}>0.00012 XRP</Mono>
          </div>
          <div className="flex justify-between mb-3">
            <span className="text-xs text-ink-mute">온/오프램프 수수료</span>
            <Mono size={12}>₩2,400</Mono>
          </div>

          <div className="px-3.5 py-3 bg-sage-soft rounded-[10px] mb-4">
            <div className="text-[11px] text-sage font-bold tracking-[0.04em]">vs SWIFT</div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-[22px] font-bold text-sage tabular-nums">
                {fmtKRW(SWIFT_SAVINGS_KRW)}
              </span>
              <span className="text-xs text-sage font-semibold">절약</span>
            </div>
          </div>

          <Button
            kind="coral"
            size="lg"
            disabled={!canSend}
            onClick={() =>
              navigate("/execute", {
                state: {
                  rlusdAmount: rlusd,
                  salaryKRW,
                  exchangeRate: EXCHANGE_RATE,
                },
              })
            }
            className="w-full mb-2"
          >
            {isLoading
              ? "준비 중…"
              : insufficientBalance
                ? `잔고 부족 (보유 ${balance?.toFixed(2)}, 필요 ${rlusd.toFixed(2)} RLUSD)`
                : rlusd < MIN_RLUSD
                  ? `최소 ${MIN_RLUSD} RLUSD 이상`
                  : `${rlusd.toFixed(2)} RLUSD 분할 송금 →`}
          </Button>
          <div className="text-center text-[11px] text-ink-mute mt-2">
            승인 시 1회 서명으로 4건 처리
          </div>
        </Card>
      </div>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  bold,
  mono,
}: {
  label: string
  value: string
  bold?: boolean
  mono?: boolean
}) {
  return (
    <div className="flex justify-between mb-2">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span
        className={`tabular-nums ${bold ? "text-base font-bold" : "text-[13px] font-medium"} ${
          mono ? "font-mono" : "font-kr"
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function MiniRateChart() {
  const points = [10, 14, 11, 18, 22, 28, 34, 30, 38, 44, 48, 42]
  return (
    <div className="px-[22px] pb-[18px] bg-bg-raised">
      <div className="flex justify-between pt-3 pb-1.5">
        <Mono size={10} className="text-ink-mute">
          D-3
        </Mono>
        <Mono size={10} className="text-coral font-bold">
          오늘 ⬤
        </Mono>
        <Mono size={10} className="text-ink-mute">
          D+7 (예측)
        </Mono>
      </div>
      <svg width="100%" height="60" viewBox="0 0 300 60" preserveAspectRatio="none">
        <path
          d={`M 0 ${60 - points[0]} ${points
            .map((p, i) => `L ${(i / (points.length - 1)) * 300} ${60 - p}`)
            .join(" ")}`}
          stroke="var(--color-coral)"
          strokeWidth="2"
          fill="none"
        />
        <circle
          cx={(7 / (points.length - 1)) * 300}
          cy={60 - points[7]}
          r="4"
          fill="var(--color-coral)"
        />
        <line
          x1={(7 / (points.length - 1)) * 300}
          y1="0"
          x2={(7 / (points.length - 1)) * 300}
          y2="60"
          stroke="var(--color-line)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />
      </svg>
    </div>
  )
}

function SetupScreen({ title, sub, note }: { title: string; sub: string; note?: string }) {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <div className="inline-block w-12 h-12 border-4 border-line border-t-coral rounded-full animate-spin mb-6" />
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-ink-soft text-sm">{sub}</p>
      {note && <p className="text-ink-mute text-xs mt-4">{note}</p>}
    </div>
  )
}
