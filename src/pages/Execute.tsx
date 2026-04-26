import { useEffect, useRef, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useSender } from "../contexts/SenderContext"
import { getFamilies, addTransaction } from "../services/storage"
import { getClient } from "../xrpl/client"
import { splitPayment, type PaymentResult } from "../xrpl/payment"
import type { Family, TransactionRecord, PaymentRecordItem } from "../types"

type StepStatus = "pending" | "running" | "completed" | "failed"

type ExecuteState = {
  rlusdAmount: number
  salaryKRW: number
  exchangeRate: number
}

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
    if (!state) {
      navigate("/send", { replace: true })
    }
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

        const results = await splitPayment(
          client,
          wallet,
          recipients,
          state.rlusdAmount,
        )

        setPaymentResults(results)
        const allSuccess = results.every((r) => r.status === "success")
        setStep2Status(allSuccess ? "completed" : "failed")

        // 부분 실패 처리
        if (!allSuccess) {
          const failedCount = results.filter((r) => r.status === "failed").length
          const firstError =
            results.find((r) => r.status === "failed")?.error ?? "알 수 없는 에러"
          setErrorMsg(
            `${failedCount}/${results.length}건 송금 실패: ${firstError}`,
          )
        }

        // localStorage에 트랜잭션 기록
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

        // Step 3: 동남아 오프램프 Mock (성공 시에만)
        if (allSuccess) {
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

  if (!state) {
    return null
  }

  const allDone =
    step1Status === "completed" &&
    step2Status === "completed" &&
    step3Status === "completed"

  const hasFailed =
    step1Status === "failed" ||
    step2Status === "failed" ||
    step3Status === "failed"

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-2">송금 실행</h1>
      <p className="text-slate-400 mb-8">
        {state.rlusdAmount.toFixed(2)} RLUSD를 가족 {families.length}명에게 분할
        송금
      </p>

      <div className="space-y-4">
        {/* Step 1: 한국 온램프 */}
        <StepCard
          step={1}
          title="한국 온램프"
          subtitle="토스뱅크 (Mock) · KRW → RLUSD"
          status={step1Status}
          detail={
            step1Status === "completed"
              ? `${state.salaryKRW.toLocaleString()} KRW → ${state.rlusdAmount.toFixed(2)} RLUSD`
              : undefined
          }
        />

        {/* Step 2: XRPL 분할 송금 */}
        <StepCard
          step={2}
          title="XRPL 1:N 분할 송금"
          subtitle="XRPL Testnet · 실제 트랜잭션"
          status={step2Status}
        >
          {step2Status !== "pending" && (
            <div className="mt-4 space-y-2">
              {families.map((f, i) => {
                const result = paymentResults[i]
                return (
                  <PaymentRow
                    key={f.id}
                    family={f}
                    result={result}
                    isPending={!result && step2Status === "running"}
                  />
                )
              })}
            </div>
          )}
        </StepCard>

        {/* Step 3: 동남아 오프램프 */}
        <StepCard
          step={3}
          title="동남아 오프램프"
          subtitle="현지 e-wallet (Mock) · RLUSD → VND"
          status={step3Status}
          detail={
            step3Status === "completed"
              ? `가족 ${families.length}명의 e-wallet에 입금 완료`
              : undefined
          }
        />
      </div>

      {/* 에러 박스 */}
      {hasFailed && errorMsg && (
        <div className="mt-6 p-5 bg-red-900/20 border border-red-700 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
              !
            </div>
            <div className="flex-1">
              <div className="font-semibold text-red-400 mb-2">송금 실패</div>
              <div className="text-sm text-slate-300 break-all mb-4">
                {errorMsg}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate("/send")}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm transition"
                >
                  ← 송금 페이지로
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm transition"
                >
                  다시 시도
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 완료 박스 */}
      {allDone && (
        <div className="mt-8 p-6 bg-green-900/20 border border-green-700 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-xl">
              ✓
            </div>
            <div>
              <h2 className="text-lg font-semibold text-green-400">
                송금 완료
              </h2>
              <p className="text-sm text-slate-400">
                총 {state.rlusdAmount.toFixed(2)} RLUSD가 분할 송금되었습니다
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-medium transition"
            >
              대시보드 →
            </button>
            <button
              onClick={() => navigate("/send")}
              className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-md text-sm font-medium transition"
            >
              다시 송금
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// =========================================
// 컴포넌트들
// =========================================

function StepCard({
  step,
  title,
  subtitle,
  status,
  detail,
  children,
}: {
  step: number
  title: string
  subtitle: string
  status: StepStatus
  detail?: string
  children?: React.ReactNode
}) {
  const borderColor = {
    pending: "border-slate-700",
    running: "border-indigo-500",
    completed: "border-green-600",
    failed: "border-red-600",
  }[status]

  const indicator = {
    pending: (
      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs text-slate-400">
        {step}
      </div>
    ),
    running: (
      <div className="w-6 h-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
    ),
    completed: (
      <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs">
        ✓
      </div>
    ),
    failed: (
      <div className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center text-xs">
        ✗
      </div>
    ),
  }[status]

  return (
    <div
      className={`p-5 bg-slate-800 border-2 ${borderColor} rounded-lg transition-colors`}
    >
      <div className="flex items-start gap-3">
        {indicator}
        <div className="flex-1">
          <div className="font-semibold">{title}</div>
          <div className="text-sm text-slate-400 mt-0.5">{subtitle}</div>
          {detail && <div className="text-sm text-slate-300 mt-2">{detail}</div>}
          {children}
        </div>
      </div>
    </div>
  )
}

function PaymentRow({
  family,
  result,
  isPending,
}: {
  family: Family
  result?: PaymentResult
  isPending: boolean
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-md text-sm">
      <div className="flex items-center gap-3">
        {isPending && !result ? (
          <div className="w-4 h-4 rounded-full border-2 border-slate-500 border-t-transparent animate-spin" />
        ) : result?.status === "success" ? (
          <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center text-[10px]">
            ✓
          </div>
        ) : result?.status === "failed" ? (
          <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center text-[10px]">
            ✗
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full bg-slate-700" />
        )}
        <div>
          <span className="font-medium">{family.label}</span>
          <span className="text-slate-500 ml-2">{family.sharePercent}%</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {result && (
          <span className="font-mono">{Number(result.amount).toFixed(2)} RLUSD</span>
        )}
        {result?.txHash && (
          <a
            href={`https://testnet.xrpl.org/transactions/${result.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 text-xs"
          >
            Explorer ↗
          </a>
        )}
        {result?.status === "failed" && result.error && (
          <span
            className="text-red-400 text-xs truncate max-w-[200px]"
            title={result.error}
          >
            {result.error}
          </span>
        )}
      </div>
    </div>
  )
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}