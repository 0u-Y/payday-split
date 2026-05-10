import { useEffect, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useSender } from "../contexts/SenderContext"
import { getFamilies, addTransaction } from "../services/storage"
import { getClient } from "../xrpl/client"
import { splitPayment, type PaymentResult } from "../xrpl/payment"
import type { Family, TransactionRecord, PaymentRecordItem } from "../types"
import { Avatar, Badge, Button, Card, Mono } from "../components/ui"
import { FAMILY_PRESET } from "../lib/family"
import { fmtKRW, shortAddr } from "../lib/format"
import { EXPLORER_BASE } from "../config"

type StepStatus = "pending" | "running" | "completed" | "failed"

type ExecuteState = {
  rlusdAmount: number
  salaryKRW: number
  exchangeRate: number
}

const colorFor = (label: string) =>
  FAMILY_PRESET.find((p) => p.label === label)?.color ?? "#1A2540"

export default function Execute() {
  const navigate = useNavigate()
  const location = useLocation()
  const { wallet } = useSender()

  const state = location.state as ExecuteState | null

  const [step1Status, setStep1Status] = useState<StepStatus>("pending")
  const [step2Status, setStep2Status] = useState<StepStatus>("pending")
  const [step3Status, setStep3Status] = useState<StepStatus>("pending")

  const [paymentResults, setPaymentResults] = useState<PaymentResult[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const startedRef = useRef(false)

  // state 없이 진입하면 /send로
  useEffect(() => {
    if (!state) navigate("/send", { replace: true })
  }, [state, navigate])

  // 송금 실행
  useEffect(() => {
    if (!state || !wallet) return
    if (startedRef.current) return
    startedRef.current = true

    const fams = getFamilies()
    setFamilies(fams)

    ;(async () => {
      // Step 1: 한국 온램프 Mock
      setStep1Status("running")
      await sleep(1500)
      setStep1Status("completed")

      // Step 2: XRPL 1:N 분할 송금
      setStep2Status("running")
      const client = await getClient()

      try {
        const recipients = fams.map((f) => ({
          address: f.walletAddress,
          sharePercent: f.sharePercent,
        }))

        const results = await splitPayment(client, wallet, recipients, state.rlusdAmount)

        setPaymentResults(results)
        const allSuccess = results.every((r) => r.status === "success")
        setStep2Status(allSuccess ? "completed" : "failed")

        if (!allSuccess) {
          const failedCount = results.filter((r) => r.status === "failed").length
          const firstError =
            results.find((r) => r.status === "failed")?.error ?? "알 수 없는 에러"
          setErrorMsg(`${failedCount}/${results.length}건 송금 실패: ${firstError}`)
        }

        // localStorage 트랜잭션 기록
        const tx: TransactionRecord = {
          id: crypto.randomUUID(),
          totalAmountKRW: state.salaryKRW,
          totalAmountRLUSD: state.rlusdAmount,
          exchangeRate: state.exchangeRate,
          status: allSuccess ? "completed" : "partial",
          mode: "local_issuer",
          createdAt: Date.now(),
          completedAt: Date.now(),
          payments: results.map(
            (r, i): PaymentRecordItem => ({
              familyId: fams[i].id,
              familyLabel: fams[i].label,
              recipientAddress: fams[i].walletAddress,
              amountRLUSD: Number(r.amount),
              txHash: r.txHash,
              status: r.status,
              error: r.error,
            }),
          ),
        }
        addTransaction(tx)

        if (allSuccess) {
          // Step 3: 동남아 오프램프 Mock
          setStep3Status("running")
          await sleep(1200)
          setStep3Status("completed")
        }
      } catch (err) {
        console.error(err)
        const msg = err instanceof Error ? err.message : String(err)
        setErrorMsg(msg)
        setStep2Status("failed")
      } finally {
        await client.disconnect()
      }
    })()
  }, [state, wallet])

  if (!state) return null

  const allDone =
    step1Status === "completed" &&
    step2Status === "completed" &&
    step3Status === "completed"

  const hasFailed =
    step1Status === "failed" ||
    step2Status === "failed" ||
    step3Status === "failed"

  let railProgressPct = 0
  if (step1Status === "completed") railProgressPct = 33
  if (step2Status === "completed") railProgressPct = 66
  if (step3Status === "completed") railProgressPct = 100

  const railGradient = `linear-gradient(to bottom, var(--color-sage) 0%, var(--color-sage) ${railProgressPct}%, var(--color-line) ${railProgressPct}%)`

  const sentFamilies = families.filter((f) => f.sharePercent > 0)

  const subText = hasFailed
    ? `${fmtKRW(state.salaryKRW)} → 가족 ${sentFamilies.length}명 · 송금 실패`
    : allDone
      ? `${fmtKRW(state.salaryKRW)} → 가족 ${sentFamilies.length}명 · 송금 완료`
      : `${fmtKRW(state.salaryKRW)} → 가족 ${sentFamilies.length}명 · 분할 송금 진행 중`

  return (
    <div className="px-14 py-8 max-w-[980px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Mono size={11} className="text-ink-mute tracking-[0.08em]">
          STEP 02 · {hasFailed ? "실패" : allDone ? "완료" : "진행 중"}
        </Mono>
        <h2 className="text-[26px] font-bold mt-1 mb-1 tracking-[-0.02em]">송금 실행</h2>
        <div className="text-[13px] text-ink-soft">{subText}</div>
      </div>

      {/* Timeline */}
      <div className="relative pl-8">
        {/* Vertical rail */}
        <div
          className="absolute left-4 top-7 bottom-7 w-0.5"
          style={{ background: railGradient }}
        />

        <ExecStep
          n={1}
          status={step1Status}
          title="한국 온램프"
          sub="토스뱅크 (Mock) · KRW → RLUSD"
        >
          <div className="flex gap-3">
            <Pill label="월급" value={fmtKRW(state.salaryKRW)} />
            <Pill label="환산" value={`${state.rlusdAmount.toFixed(2)} RLUSD`} mono />
            <Pill label="환율" value={`1 USD = ₩${state.exchangeRate}`} />
          </div>
        </ExecStep>

        <ExecStep
          n={2}
          status={step2Status}
          title="XRPL 1:N 분할 송금"
          sub="XRPL Testnet · 실제 트랜잭션"
        >
          {step2Status !== "pending" && families.length > 0 && (
            <Card padded={false} className="mt-1 overflow-hidden">
              {families.map((f, i) => {
                const result = paymentResults[i]
                const amt = ((state.rlusdAmount * f.sharePercent) / 100).toFixed(2)
                return (
                  <PaymentRow
                    key={f.id}
                    family={f}
                    result={result}
                    amount={amt}
                    isLast={i === families.length - 1}
                    isPending={!result && step2Status === "running"}
                  />
                )
              })}
            </Card>
          )}
        </ExecStep>

        <ExecStep
          n={3}
          status={step3Status}
          title="동남아 오프램프"
          sub="현지 e-wallet (Mock) · RLUSD → VND"
        >
          <div className="text-xs text-ink-mute">
            XRPL 분할 송금 완료 후 가족별 e-wallet으로 즉시 정산
          </div>
        </ExecStep>
      </div>

      {/* 실패 박스 */}
      {hasFailed && errorMsg && (
        <div className="mt-6 p-5 bg-red-soft border border-red rounded-[14px]">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-red rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              !
            </div>
            <div className="flex-1">
              <div className="font-bold text-red mb-2">송금 실패</div>
              <div className="text-sm text-ink-soft break-all mb-4">{errorMsg}</div>
              <div className="flex gap-2">
                <Button kind="secondary" size="sm" onClick={() => navigate("/send")}>
                  ← 송금 페이지로
                </Button>
                <Button kind="ink" size="sm" onClick={() => window.location.reload()}>
                  다시 시도
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 완료 박스 */}
      {allDone && (
        <div className="mt-8 p-6 bg-sage-soft border border-sage rounded-[14px]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-sage rounded-full flex items-center justify-center text-white text-xl font-bold">
              ✓
            </div>
            <div>
              <h2 className="text-lg font-bold text-sage">송금 완료</h2>
              <p className="text-sm text-ink-soft">
                총 {state.rlusdAmount.toFixed(2)} RLUSD가 가족 {sentFamilies.length}명에게
                분할 송금되었습니다
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              kind="coral"
              size="md"
              className="flex-1"
              onClick={() => navigate("/dashboard")}
            >
              대시보드 →
            </Button>
            <Button
              kind="secondary"
              size="md"
              className="flex-1"
              onClick={() => navigate("/send")}
            >
              다시 송금
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ExecStep({
  n,
  status,
  title,
  sub,
  children,
}: {
  n: number
  status: StepStatus
  title: string
  sub: string
  children?: React.ReactNode
}) {
  const dotBg = {
    pending: "bg-ink-faint",
    running: "bg-coral",
    completed: "bg-sage",
    failed: "bg-red",
  }[status]

  const badgeKind = ({
    pending: "neutral",
    running: "coral",
    completed: "sage",
    failed: "red",
  } as const)[status]

  const badgeText = {
    pending: "대기",
    running: "진행 중",
    completed: "완료",
    failed: "실패",
  }[status]

  return (
    <div className="relative pb-5">
      {/* Node dot */}
      <div
        className={`absolute w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[9px] font-bold border-4 border-bg ${dotBg}`}
        style={{ left: -24, top: 0 }}
      >
        {status === "completed" ? "✓" : status === "failed" ? "✗" : n}
      </div>
      <Card padded={false} className="p-[18px]">
        <div className="mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold">{title}</span>
            <Badge kind={badgeKind}>
              {status === "running" && (
                <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse-dot" />
              )}
              {badgeText}
            </Badge>
          </div>
          <div className="text-xs text-ink-mute mt-0.5">{sub}</div>
        </div>
        {children}
      </Card>
    </div>
  )
}

function Pill({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex-1 px-3 py-2.5 bg-bg rounded-[10px]">
      <div className="text-[10px] text-ink-mute font-bold tracking-[0.04em] mb-0.5">
        {label}
      </div>
      <div
        className={`text-sm font-bold tabular-nums ${mono ? "font-mono" : "font-kr"}`}
      >
        {value}
      </div>
    </div>
  )
}

function PaymentRow({
  family,
  result,
  amount,
  isLast,
  isPending,
}: {
  family: Family
  result?: PaymentResult
  amount: string
  isLast: boolean
  isPending: boolean
}) {
  const color = colorFor(family.label)
  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 ${
        isLast ? "" : "border-b border-line-soft"
      }`}
    >
      <Avatar name={family.label} size={28} color={color} />
      <div className="flex-1">
        <div className="text-[13px] font-semibold">
          {family.label}{" "}
          <span className="text-ink-mute font-medium">· {family.sharePercent}%</span>
        </div>
        <Mono size={10} className="text-ink-mute">
          {shortAddr(family.walletAddress)}
        </Mono>
      </div>
      <Mono size={13} className="font-bold w-20 text-right">
        {amount}
      </Mono>
      <div className="w-[130px] text-right">
        {result?.status === "success" && result.txHash ? (
          <a
            href={`${EXPLORER_BASE}/transactions/${result.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage-soft text-sage font-mono text-[11px] font-bold no-underline"
          >
            {result.txHash.slice(0, 12)} ↗
          </a>
        ) : result?.status === "failed" ? (
          <Badge kind="red">실패</Badge>
        ) : isPending ? (
          <Badge kind="amber">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-amber/30 border-t-amber animate-spin" />
            전송 중
          </Badge>
        ) : (
          <Badge kind="neutral">대기</Badge>
        )}
      </div>
    </div>
  )
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}
