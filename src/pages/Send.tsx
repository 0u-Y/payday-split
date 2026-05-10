import { useEffect, useMemo, useRef, useState } from "react"
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
import { fmtKRW, fmtRLUSD, shortAddr } from "../lib/format"
import { getAISignal, type SignalLevel } from "../lib/aiSignal"
import { EXCHANGE_RATE_KRW_USD } from "../config"

const PRESET_FAMILIES = [
  { label: "어머니", country: "VN", sharePercent: 40 },
  { label: "아버지", country: "VN", sharePercent: 30 },
  { label: "남동생", country: "VN", sharePercent: 15 },
  { label: "여동생", country: "VN", sharePercent: 15 },
]

const SWIFT_SAVINGS_KRW = 117_600
const MIN_RLUSD = 1

const colorFor = (label: string) =>
  FAMILY_PRESET.find((p) => p.label === label)?.color ?? "#1A2540"

type SignalTone = {
  card: string
  bg: string
  text: string
  badge: "coral" | "sage" | "ink" | "amber" | "red" | "neutral"
  stroke: string
}

const LEVEL_TONE: Record<SignalLevel, SignalTone> = {
  strong: {
    card: "border-coral",
    bg: "bg-coral-soft",
    text: "text-coral-dark",
    badge: "coral",
    stroke: "var(--color-coral)",
  },
  good: {
    card: "border-sage",
    bg: "bg-sage-soft",
    text: "text-sage",
    badge: "sage",
    stroke: "var(--color-sage)",
  },
  neutral: {
    card: "border-line",
    bg: "bg-bg-sunken",
    text: "text-ink",
    badge: "neutral",
    stroke: "var(--color-ink-soft)",
  },
  wait: {
    card: "border-coral",
    bg: "bg-coral-faint",
    text: "text-coral",
    badge: "coral",
    stroke: "var(--color-coral)",
  },
  warning: {
    card: "border-coral-dark",
    bg: "bg-coral-soft",
    text: "text-coral-dark",
    badge: "coral",
    stroke: "var(--color-coral-dark)",
  },
}

function fmtSavingsKRW(n: number): string {
  if (n >= 1_000_000) return `+₩${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `+₩${Math.round(n / 1000)}K`
  return `+₩${Math.round(n).toLocaleString("ko-KR")}`
}

export default function Send() {
  const navigate = useNavigate()
  const { address, isReady, isFirstTime, isCrossmark, isWalletConnected } = useSender()

  const [families, setFamilies] = useState<Family[]>([])
  const [setupStep, setSetupStep] = useState<string>("")
  const [salaryKRW, setSalaryKRW] = useState<number>(3_000_000)
  const [balance, setBalance] = useState<number | null>(null)
  const setupStartedRef = useRef(false)

  // 미연결 상태로 직접 /send 진입하면 랜딩으로 돌려보냄
  useEffect(() => {
    if (isCrossmark && !address) {
      navigate("/", { replace: true })
    } else if (!isCrossmark && !isWalletConnected) {
      navigate("/", { replace: true })
    }
  }, [isCrossmark, address, isWalletConnected, navigate])

  // 가족 셋업
  useEffect(() => {
    if (!isReady) return
    if (setupStartedRef.current) return
    setupStartedRef.current = true

    ;(async () => {
      const existing = getFamilies()
      // 사전 셋업으로 가족이 이미 있으면 자동 셋업 skip (시연 흐름).
      if (existing.length > 0) {
        setFamilies(existing)
        return
      }

      setSetupStep(`가족 ${PRESET_FAMILIES.length}명 셋업 중...`)
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

  const rlusd = salaryKRW / EXCHANGE_RATE_KRW_USD
  const totalShare = families.reduce((sum, f) => sum + f.sharePercent, 0)

  const signal = useMemo(() => getAISignal(), [])
  const tone = LEVEL_TONE[signal.level]
  const showSavings = signal.level === "strong" || signal.level === "good"
  const savingsKRW =
    signal.mean > 0 ? (salaryKRW * (signal.mean - signal.latest)) / signal.mean : 0

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
    families.length > 0 &&
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
          <div className="text-[13px] text-ink-soft">월급을 가족 {families.length}명에게 비율대로 분할합니다</div>
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
                {fmtRLUSD(rlusd)}
              </Mono>
              <span className="text-[11px] text-ink-mute font-semibold">RLUSD</span>
              <span className="text-[11px] text-ink-mute ml-2">1 USD = ₩{EXCHANGE_RATE_KRW_USD.toLocaleString("ko-KR")}</span>
            </div>
          </div>
        </Card>

        {/* AI rate signal */}
        <Card padded={false} className={`mb-4 overflow-hidden ${tone.card}`}>
          <div className={`px-[22px] py-[18px] ${tone.bg}`}>
            <div className="flex justify-between items-start">
              <div>
                <Badge kind={tone.badge} className="mb-2">
                  AI 환율 시그널
                </Badge>
                <div className={`text-[22px] font-bold tracking-[-0.02em] ${tone.text}`}>
                  {signal.message}
                </div>
                <div className="text-[11px] text-ink-mute mt-1.5 font-mono tabular-nums">
                  현재 ₩{Math.round(signal.latest).toLocaleString()} · 7일 평균 ₩
                  {Math.round(signal.mean).toLocaleString()} · σ{" "}
                  {signal.sigma >= 0 ? "+" : ""}
                  {signal.sigma.toFixed(2)}
                </div>
              </div>
              {showSavings && savingsKRW > 0 && (
                <div className="text-right">
                  <div className="text-[11px] text-ink-mute font-semibold">예상 절약</div>
                  <div className={`text-[22px] font-bold tabular-nums ${tone.text}`}>
                    {fmtSavingsKRW(savingsKRW)}
                  </div>
                </div>
              )}
            </div>
          </div>
          <MiniRateChart data={signal.chartData} stroke={tone.stroke} />
        </Card>

        {/* Family list */}
        <Card padded={false}>
          <div className="px-5 py-3.5 border-b border-line-soft flex justify-between items-center">
            <div className="text-sm font-bold">가족 {families.length}명 · 비율 분할</div>
            <Badge
              kind={
                Math.abs(totalShare - 100) < 0.01
                  ? "sage"
                  : totalShare > 100
                    ? "red"
                    : "amber"
              }
            >
              합계 {totalShare}%
            </Badge>
          </div>
          {families.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-mute">
              가족 정보 불러오는 중…
            </div>
          ) : (
            families.map((f, i) => (
              <FamilyRow
                key={f.id}
                family={f}
                rlusd={rlusd}
                color={colorFor(f.label)}
                isLast={i === families.length - 1}
                onChange={(target) => updateShare(f.id, target)}
              />
            ))
          )}
          {families.length > 0 && Math.abs(totalShare - 100) >= 0.01 && (
            <div
              className={`px-5 py-3 border-t border-line-soft text-xs font-semibold flex items-center gap-2 ${
                totalShare > 100
                  ? "bg-red-soft text-red"
                  : "bg-amber-soft text-amber-dark"
              }`}
            >
              <span className="text-base leading-none">⚠</span>
              {totalShare > 100
                ? `합계가 100%를 ${totalShare - 100}% 초과했습니다. 비율을 줄여주세요.`
                : `합계가 100%에서 ${100 - totalShare}% 부족합니다.`}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate("/family/new")}
            className="w-full px-5 py-3 border-t border-line-soft text-sm font-semibold text-coral hover:bg-bg-sunken text-left cursor-pointer transition-colors"
          >
            + 새 가족 등록
          </button>
        </Card>
      </div>

      {/* RIGHT — summary */}
      <div>
        <Card padded={false} className="p-6 sticky top-[76px]">
          <div className="text-xs text-ink-mute font-bold tracking-[0.06em] mb-3.5">송금 요약</div>

          <SummaryRow label="총 보낼 금액" value={fmtKRW(salaryKRW)} bold />
          <SummaryRow label="환산" value={`= ${fmtRLUSD(rlusd)} RLUSD`} mono />
          <SummaryRow label="수신인" value={`가족 ${families.length}명 · 베트남`} />

          <div className="h-px bg-line my-3.5" />

          {/* 잔액 전후 */}
          <div className="px-3.5 py-3 bg-bg-sunken rounded-[10px] mb-3">
            <div className="text-[11px] text-ink-mute font-bold tracking-[0.04em] mb-2">내 잔액</div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-ink-soft">송금 전</span>
              <span className="font-mono text-sm font-bold text-ink">
                {balance !== null ? `${fmtRLUSD(balance)} RLUSD` : "—"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-ink-soft">송금 후</span>
              <span className={`font-mono text-sm font-bold ${
                balance !== null && balance - rlusd >= 0 ? "text-sage" : "text-coral"
              }`}>
                {balance !== null ? `${fmtRLUSD(balance - rlusd)} RLUSD` : "—"}
              </span>
            </div>
          </div>

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
                  exchangeRate: EXCHANGE_RATE_KRW_USD,
                },
              })
            }
            className="w-full mb-2"
          >
            {isLoading
              ? "준비 중…"
              : insufficientBalance
                ? `잔고 부족 (보유 ${fmtRLUSD(balance!)}, 필요 ${fmtRLUSD(rlusd)} RLUSD)`
                : rlusd < MIN_RLUSD
                  ? `최소 ${MIN_RLUSD} RLUSD 이상`
                  : `${fmtRLUSD(rlusd)} RLUSD 분할 송금 →`}
          </Button>
          <div className="text-center text-[11px] text-ink-mute mt-2">
            승인 시 1회 서명으로 {families.length}건 처리
          </div>
        </Card>
      </div>
    </div>
  )
}

function FamilyRow({
  family,
  rlusd,
  color,
  isLast,
  onChange,
}: {
  family: Family
  rlusd: number
  color: string
  isLast: boolean
  onChange: (target: number) => void
}) {
  const amt = (rlusd * family.sharePercent) / 100

  return (
    <div
      className={`px-5 py-3 flex items-center gap-3.5 ${
        !isLast ? "border-b border-line-soft" : ""
      }`}
    >
      <Avatar name={family.label} size={36} color={color} />
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold">{family.label}</span>
          {family.kycVerifiedAt && (
            <span
              title={[
                "KYC 인증",
                family.kycIssuer && `발급자: ${family.kycIssuer}`,
                `인증일: ${family.kycVerifiedAt}`,
                family.did && `DID: ${shortAddr(family.did)}`,
              ]
                .filter(Boolean)
                .join("\n")}
              className="inline-flex"
            >
              <Badge kind="sage" className="text-[10px] px-1.5 py-0">
                ✓ KYC
              </Badge>
            </span>
          )}
        </div>
        <div className="text-[11px] text-ink-mute flex items-center gap-1.5 mt-0.5">
          <FlagChip code={family.country} size={12} />
          <Mono size={11}>{shortAddr(family.walletAddress)}</Mono>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(family.sharePercent - 1)}
          disabled={family.sharePercent <= 0}
          className="w-7 h-7 rounded-md border border-line text-sm font-bold text-ink-soft hover:bg-bg-sunken disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="감소"
        >
          −
        </button>
        <div className="flex items-baseline gap-0.5 px-2.5 h-7 border border-line rounded-md bg-bg-raised w-[68px] focus-within:border-coral">
          <input
            type="text"
            inputMode="numeric"
            value={family.sharePercent}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "")
              onChange(digits === "" ? 0 : parseInt(digits, 10))
            }}
            className="flex-1 min-w-0 text-right text-sm font-bold tabular-nums bg-transparent border-0 outline-none font-kr"
            style={{ color }}
          />
          <span className="text-sm font-bold text-ink-mute">%</span>
        </div>
        <button
          type="button"
          onClick={() => onChange(family.sharePercent + 1)}
          disabled={family.sharePercent >= 100}
          className="w-7 h-7 rounded-md border border-line text-sm font-bold text-ink-soft hover:bg-bg-sunken disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="증가"
        >
          +
        </button>
      </div>
      <div className="w-[90px] text-right">
        <Mono size={13} className="font-bold">
          {amt.toFixed(2)}
        </Mono>
        <div className="text-[10px] text-ink-mute font-semibold">RLUSD</div>
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

function MiniRateChart({ data, stroke }: { data: number[]; stroke: string }) {
  const W = 300
  const H = 60
  const PAD = 6
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const coords = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - PAD - ((v - min) / range) * (H - PAD * 2),
  }))
  const pathD = coords
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ")
  const last = coords[coords.length - 1]

  return (
    <div className="px-[22px] pb-[18px] bg-bg-raised">
      <div className="flex justify-between pt-3 pb-1.5">
        <Mono size={10} className="text-ink-mute">
          7일 전
        </Mono>
        <Mono size={10} className="font-bold" style={{ color: stroke }}>
          오늘 ⬤
        </Mono>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path d={pathD} stroke={stroke} strokeWidth="2" fill="none" />
        <circle cx={last.x} cy={last.y} r="4" fill={stroke} />
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
