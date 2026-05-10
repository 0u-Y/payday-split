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
  strong: { card: "border-coral", bg: "bg-coral-soft", text: "text-coral-dark", badge: "coral", stroke: "var(--color-coral)" },
  good: { card: "border-sage", bg: "bg-sage-soft", text: "text-sage", badge: "sage", stroke: "var(--color-sage)" },
  neutral: { card: "border-line", bg: "bg-bg-sunken", text: "text-ink", badge: "neutral", stroke: "var(--color-ink-soft)" },
  wait: { card: "border-coral", bg: "bg-coral-faint", text: "text-coral", badge: "coral", stroke: "var(--color-coral)" },
  warning: { card: "border-coral-dark", bg: "bg-coral-soft", text: "text-coral-dark", badge: "coral", stroke: "var(--color-coral-dark)" },
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

  useEffect(() => {
    if (isCrossmark && !address) navigate("/", { replace: true })
    else if (!isCrossmark && !isWalletConnected) navigate("/", { replace: true })
  }, [isCrossmark, address, isWalletConnected, navigate])

  useEffect(() => {
    if (!isReady || setupStartedRef.current) return
    setupStartedRef.current = true
    ;(async () => {
      const existing = getFamilies()
      if (existing.length > 0) { setFamilies(existing); return }
      setSetupStep(`가족 ${PRESET_FAMILIES.length}명 셋업 중...`)
      const client = await getClient()
      try {
        for (let i = 0; i < PRESET_FAMILIES.length; i++) {
          const preset = PRESET_FAMILIES[i]
          if (existing.find((f) => f.label === preset.label)) continue
          setSetupStep(`${preset.label} 지갑 생성 중... (${i + 1}/${PRESET_FAMILIES.length})`)
          const wallet = await createFundedWallet(client)
          await setRLUSDTrustLine(client, wallet)
          addFamily({ id: crypto.randomUUID(), label: preset.label, walletAddress: wallet.address, walletSeed: wallet.seed!, sharePercent: preset.sharePercent, country: preset.country, registeredAt: Date.now() })
        }
        setFamilies(getFamilies())
        setSetupStep("")
      } finally { await client.disconnect() }
    })()
  }, [isReady])

  useEffect(() => {
    if (!isReady || !address || setupStep) return
    ;(async () => {
      const client = await getClient()
      try { setBalance(await getRLUSDBalance(client, address)) }
      catch (err) { console.error("잔고 조회 실패:", err) }
      finally { await client.disconnect() }
    })()
  }, [isReady, address, setupStep, families.length])

  if (isFirstTime && !isReady) return <SetupScreen title="계정 준비 중" sub="XRPL Testnet 지갑 초기화 중입니다 (10~15초)" />
  if (setupStep) return <SetupScreen title="수신인 초기화 중" sub={setupStep} note="최초 1회만 진행됩니다" />

  const rlusd = salaryKRW / EXCHANGE_RATE_KRW_USD
  const totalShare = families.reduce((sum, f) => sum + f.sharePercent, 0)
  const signal = useMemo(() => getAISignal(), [])
  const tone = LEVEL_TONE[signal.level]
  const showSavings = signal.level === "strong" || signal.level === "good"
  const savingsKRW = signal.mean > 0 ? (salaryKRW * (signal.mean - signal.latest)) / signal.mean : 0
  const insufficientBalance = balance !== null && balance < rlusd
  const isLoading = !isReady || balance === null
  const canSend = !!address && families.length > 0 && Math.abs(totalShare - 100) < 0.01 && !insufficientBalance && !isLoading && rlusd >= MIN_RLUSD

  const updateShare = (id: string, raw: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(raw) ? 0 : raw))
    setFamilies((prev) => prev.map((f) => (f.id === id ? { ...f, sharePercent: clamped } : f)))
    updateFamily(id, { sharePercent: clamped })
  }

  return (
    <div className="px-10 py-8 grid grid-cols-[1fr_340px] gap-6 max-w-[1100px] mx-auto">

      {/* LEFT */}
      <div className="flex flex-col gap-4">

        {/* Amount input */}
        <Card padded={false} className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="text-[11px] font-bold tracking-[0.08em] text-ink-mute mb-1">SEND AMOUNT</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-ink-mute mb-0.5">Available</div>
              <Mono size={12} className="font-semibold text-ink">
                {balance !== null ? `${fmtRLUSD(balance)} RLUSD` : "—"}
              </Mono>
              <div className="text-[10px] text-ink-mute mt-0.5">
                {balance !== null ? fmtKRW(balance * EXCHANGE_RATE_KRW_USD) : ""}
              </div>
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-[32px] text-ink-mute font-light">₩</span>
            <input
              type="text"
              inputMode="numeric"
              value={salaryKRW === 0 ? "" : salaryKRW.toLocaleString("ko-KR")}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^0-9]/g, "")
                setSalaryKRW(digits ? parseInt(digits, 10) : 0)
              }}
              placeholder="0"
              className="flex-1 min-w-0 p-0 bg-transparent border-0 outline-none text-[48px] font-bold tracking-[-0.03em] tabular-nums text-ink placeholder:text-ink-faint"
            />
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 bg-bg-sunken rounded-[8px]">
            <span className="text-[11px] text-ink-mute">RLUSD equivalent</span>
            <div className="flex items-baseline gap-1.5">
              <Mono size={15} className="font-bold text-ink">= {fmtRLUSD(rlusd)}</Mono>
              <span className="text-[11px] text-ink-mute">RLUSD</span>
              <span className="text-[11px] text-ink-faint ml-1">@ ₩{EXCHANGE_RATE_KRW_USD.toLocaleString("ko-KR")}</span>
            </div>
          </div>
        </Card>

        {/* AI signal */}
        <Card padded={false} className={`overflow-hidden ${tone.card}`}>
          <div className={`px-5 py-3.5 ${tone.bg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Badge kind={tone.badge}>FX Signal</Badge>
              <span className={`text-[14px] font-bold ${tone.text}`}>
                {signal.level === "strong" ? "Good time to send" : signal.level === "good" ? "Favorable rate" : signal.level === "wait" ? "Consider waiting" : signal.level === "warning" ? "Rate unfavorable" : "Rate is average"}
              </span>
            </div>
            {showSavings && savingsKRW > 0 && (
              <span className={`text-[13px] font-bold tabular-nums ${tone.text}`}>{fmtSavingsKRW(savingsKRW)}</span>
            )}
          </div>
          <MiniRateChart data={signal.chartData} stroke={tone.stroke} />
        </Card>

        {/* Recipients */}
        <Card padded={false}>
          <div className="px-5 py-3.5 border-b border-line-soft flex items-center justify-between">
            <div className="text-[11px] font-bold tracking-[0.08em] text-ink-mute">RECIPIENTS</div>
            <Badge kind={Math.abs(totalShare - 100) < 0.01 ? "sage" : totalShare > 100 ? "red" : "amber"}>
              {totalShare}%
            </Badge>
          </div>
          {families.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-mute">Loading recipients…</div>
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
            <div className={`px-5 py-2.5 border-t border-line-soft text-xs font-semibold flex items-center gap-2 ${totalShare > 100 ? "bg-red-soft text-red" : "bg-amber-soft text-amber-dark"}`}>
              <span>⚠</span>
              {totalShare > 100
                ? `Over-allocated by ${totalShare - 100}%`
                : `Under-allocated by ${100 - totalShare}%`}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate("/family/new")}
            className="w-full px-5 py-3 border-t border-line-soft text-[12px] font-semibold text-coral hover:bg-bg-sunken text-left cursor-pointer transition-colors"
          >
            + Add recipient
          </button>
        </Card>
      </div>

      {/* RIGHT — summary */}
      <div>
        <Card padded={false} className="sticky top-[76px]">
          <div className="px-5 py-4 border-b border-line-soft">
            <div className="text-[11px] font-bold tracking-[0.08em] text-ink-mute">TRANSACTION SUMMARY</div>
          </div>

          <div className="px-5 py-4 flex flex-col gap-2.5">
            <Row label="Send amount" value={fmtKRW(salaryKRW)} bold />
            <Row label="RLUSD equivalent" value={`= ${fmtRLUSD(rlusd)} RLUSD`} mono />
            <div className="h-px bg-line-soft my-0.5" />
            <div className="flex justify-between items-start">
              <span className="text-[12px] text-ink-soft">Recipients</span>
              <div className="text-right">
                <div className="text-[12px] font-medium">{families.filter(f => f.sharePercent > 0).length} wallets · Vietnam</div>
                {families.filter(f => f.sharePercent > 0).map(f => (
                  <div key={f.id} className="text-[11px] text-ink-mute mt-0.5">
                    {f.label} · {fmtRLUSD((rlusd * f.sharePercent) / 100)} RLUSD
                  </div>
                ))}
              </div>
            </div>
            <div className="h-px bg-line-soft my-0.5" />
            <Row label="Network fee" value="0.00012 XRP" mono />
            <Row label="On/off-ramp fee" value="₩2,400" />
          </div>

          <div className="px-5 pb-4">
            <div className="rounded-[8px] border border-line overflow-hidden mb-3">
              <div className="flex items-stretch">
                <div className="flex-1 px-4 py-2.5">
                  <div className="text-[10px] text-ink-mute font-semibold mb-0.5">Before</div>
                  <Mono size={12} className="font-semibold text-ink">
                    {balance !== null ? `${fmtRLUSD(balance)} RLUSD` : "—"}
                  </Mono>
                  {balance !== null && (
                    <div className="text-[10px] text-ink-mute mt-0.5">{fmtKRW(balance * EXCHANGE_RATE_KRW_USD)}</div>
                  )}
                </div>
                <div className="w-px bg-line" />
                <div className="flex-1 px-4 py-2.5">
                  <div className="text-[10px] text-ink-mute font-semibold mb-0.5">After</div>
                  <Mono size={12} className={`font-semibold ${balance !== null && balance - rlusd >= 0 ? "text-sage" : "text-coral"}`}>
                    {balance !== null ? `${fmtRLUSD(balance - rlusd)} RLUSD` : "—"}
                  </Mono>
                  {balance !== null && (
                    <div className="text-[10px] text-ink-mute mt-0.5">{fmtKRW((balance - rlusd) * EXCHANGE_RATE_KRW_USD)}</div>
                  )}
                </div>
              </div>
            </div>

            <Row label="Saved vs SWIFT" value={fmtKRW(SWIFT_SAVINGS_KRW)} muted />

            <Button
              kind="coral"
              size="lg"
              disabled={!canSend}
              onClick={() => navigate("/execute", { state: { rlusdAmount: rlusd, salaryKRW, exchangeRate: EXCHANGE_RATE_KRW_USD } })}
              className="w-full mb-2"
            >
              {isLoading
                ? "Checking balance…"
                : insufficientBalance
                  ? `Insufficient · ${fmtRLUSD(balance!)} RLUSD available`
                  : rlusd < MIN_RLUSD
                    ? `Minimum ${MIN_RLUSD} RLUSD required`
                    : `Send ${fmtRLUSD(rlusd)} RLUSD →`}
            </Button>
            <div className="text-center text-[11px] text-ink-mute">
              {families.filter(f => f.sharePercent > 0).length} txs · single signature
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function FamilyRow({ family, rlusd, color, isLast, onChange }: {
  family: Family; rlusd: number; color: string; isLast: boolean; onChange: (target: number) => void
}) {
  const amt = (rlusd * family.sharePercent) / 100
  return (
    <div className={`px-5 py-3 flex items-center gap-3 ${!isLast ? "border-b border-line-soft" : ""}`}>
      <Avatar name={family.label} size={32} color={color} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold">{family.label}</span>
          {family.kycVerifiedAt && (
            <Badge kind="sage" className="text-[9px] px-1.5 py-0">KYC</Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <FlagChip code={family.country} size={11} />
          <Mono size={10} className="text-ink-mute">{shortAddr(family.walletAddress)}</Mono>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onChange(family.sharePercent - 1)} disabled={family.sharePercent <= 0}
          className="w-6 h-6 rounded border border-line text-xs font-bold text-ink-soft hover:bg-bg-sunken disabled:opacity-30 disabled:cursor-not-allowed">−</button>
        <div className="flex items-baseline gap-0.5 px-2 h-6 border border-line rounded bg-bg-raised w-[60px] focus-within:border-coral">
          <input type="text" inputMode="numeric" value={family.sharePercent}
            onChange={(e) => { const d = e.target.value.replace(/[^0-9]/g, ""); onChange(d === "" ? 0 : parseInt(d, 10)) }}
            className="flex-1 min-w-0 text-right text-xs font-bold tabular-nums bg-transparent border-0 outline-none"
            style={{ color }} />
          <span className="text-xs font-bold text-ink-mute">%</span>
        </div>
        <button type="button" onClick={() => onChange(family.sharePercent + 1)} disabled={family.sharePercent >= 100}
          className="w-6 h-6 rounded border border-line text-xs font-bold text-ink-soft hover:bg-bg-sunken disabled:opacity-30 disabled:cursor-not-allowed">+</button>
      </div>
      <div className="w-[80px] text-right">
        <Mono size={12} className="font-bold">{fmtRLUSD(amt)}</Mono>
        <div className="text-[9px] text-ink-mute font-semibold">RLUSD</div>
      </div>
    </div>
  )
}

function Row({ label, value, bold, mono, muted }: { label: string; value: string; bold?: boolean; mono?: boolean; muted?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-[12px] ${muted ? "text-ink-faint" : "text-ink-soft"}`}>{label}</span>
      <span className={`tabular-nums ${bold ? "text-[13px] font-bold" : "text-[12px] font-medium"} ${mono ? "font-mono" : ""} ${muted ? "text-ink-faint" : ""}`}>{value}</span>
    </div>
  )
}

function MiniRateChart({ data, stroke }: { data: number[]; stroke: string }) {
  const W = 300; const H = 52; const PAD = 5
  const min = Math.min(...data); const max = Math.max(...data); const range = max - min || 1
  const coords = data.map((v, i) => ({ x: (i / (data.length - 1)) * W, y: H - PAD - ((v - min) / range) * (H - PAD * 2) }))
  const pathD = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
  const last = coords[coords.length - 1]
  return (
    <div className="px-5 pb-4 bg-bg-raised">
      <div className="flex justify-between pt-2 pb-1">
        <Mono size={9} className="text-ink-mute">7d ago</Mono>
        <Mono size={9} className="font-bold" style={{ color: stroke }}>Today</Mono>
      </div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path d={pathD} stroke={stroke} strokeWidth="1.5" fill="none" />
        <circle cx={last.x} cy={last.y} r="3" fill={stroke} />
      </svg>
    </div>
  )
}

function SetupScreen({ title, sub, note }: { title: string; sub: string; note?: string }) {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <div className="inline-block w-10 h-10 border-4 border-line border-t-coral rounded-full animate-spin mb-6" />
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <p className="text-ink-soft text-sm">{sub}</p>
      {note && <p className="text-ink-mute text-xs mt-3">{note}</p>}
    </div>
  )
}
