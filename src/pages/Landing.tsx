import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button, Mono } from "../components/ui"
import { useSender } from "../contexts/SenderContext"
import { useWalletConnect } from "../contexts/WalletConnectContext"

export default function Landing() {
  const navigate = useNavigate()
  const { isCrossmark, address, isWalletConnected, connectCrossmark } = useSender()
  const { open } = useWalletConnect()
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showCrossmarkConnectButton = isCrossmark && !address

  const handleCrossmarkConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      await connectCrossmark()
      navigate("/send")
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setConnecting(false)
    }
  }

  const handleStartSendFromUnconnected = () => {
    open({ onConnected: () => navigate("/send") })
  }

  return (
    <div className="min-h-[calc(100vh-60px)] flex flex-col">

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-line bg-bg-raised mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-sage inline-block" />
          <span className="text-[11px] font-semibold text-ink-mute tracking-wide">XRPL Testnet · RLUSD</span>
        </div>

        <h1 className="text-[52px] leading-[1.1] tracking-[-0.03em] font-bold text-ink m-0 max-w-[640px]">
          월급 하나로,<br />본국 가족 모두에게.
        </h1>

        <p className="text-[15px] leading-[1.7] text-ink-soft mt-5 mb-8 max-w-[480px]">
          재한 외국인 근로자가 매월 보내는 송금을 XRPL 위에서
          단일 정산 사이클로 처리합니다. 수수료 사실상 0%, 정산 3초.
        </p>

        <div className="flex items-center gap-3 mb-4">
          {showCrossmarkConnectButton ? (
            <Button kind="primary" size="lg" onClick={handleCrossmarkConnect} disabled={connecting}>
              {connecting ? "연결 중…" : "Crossmark로 시작 →"}
            </Button>
          ) : !isCrossmark && !isWalletConnected ? (
            <Button kind="primary" size="lg" onClick={handleStartSendFromUnconnected}>
              송금 시작 →
            </Button>
          ) : (
            <Link to="/send">
              <Button kind="primary" size="lg">송금 시작 →</Button>
            </Link>
          )}
        </div>

        {error && <div className="text-xs text-red font-semibold">{error}</div>}

        {/* Stats */}
        <div className="flex items-center gap-8 mt-10 pt-8 border-t border-line">
          <Stat value="$0.0001" label="건당 수수료" />
          <div className="w-px h-8 bg-line" />
          <Stat value="3.4초" label="평균 정산" />
          <div className="w-px h-8 bg-line" />
          <Stat value="98%" label="vs SWIFT 절감" coral />
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-line bg-bg-raised px-8 py-10">
        <div className="max-w-[860px] mx-auto">
          <p className="text-[10px] font-bold tracking-[0.12em] text-ink-mute mb-6 uppercase">
            How it works
          </p>
          <div className="grid grid-cols-3 gap-4">
            <HowStep
              n="01"
              title="한국 온램프"
              sub="토스뱅크 → RLUSD"
              detail="월급 KRW를 스테이블코인으로 환전"
            />
            <HowStep
              n="02"
              title="XRPL 1:N 분할"
              sub="단일 정산 사이클"
              detail="가족 비율대로 병렬 Payment 트랜잭션"
            />
            <HowStep
              n="03"
              title="현지 오프램프"
              sub="VND / PHP / THB"
              detail="가족이 즉시 현지 e-wallet으로 수령"
            />
          </div>
        </div>
      </div>

    </div>
  )
}

function Stat({ value, label, coral }: { value: string; label: string; coral?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-[26px] font-bold tracking-[-0.02em] tabular-nums ${coral ? "text-coral" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-[11px] text-ink-mute mt-0.5 font-medium">{label}</div>
    </div>
  )
}

function HowStep({ n, title, sub, detail }: { n: string; title: string; sub: string; detail: string }) {
  return (
    <div className="flex gap-4">
      <Mono size={11} className="text-coral font-bold mt-[2px] shrink-0">{n}</Mono>
      <div>
        <div className="text-[13px] font-semibold text-ink mb-0.5">{title}</div>
        <div className="text-[11px] text-ink-soft font-medium mb-1">{sub}</div>
        <div className="text-[11px] text-ink-mute leading-[1.6]">{detail}</div>
      </div>
    </div>
  )
}
