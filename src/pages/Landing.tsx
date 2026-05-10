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
    <div className="min-h-[calc(100vh-60px)] flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[1000px] grid grid-cols-[1.6fr_1px_1fr] gap-0">

        {/* LEFT — hero */}
        <div className="pr-14 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-line bg-bg-raised mb-7 self-start">
            <span className="w-1.5 h-1.5 rounded-full bg-sage inline-block" />
            <span className="text-[11px] font-semibold text-ink-mute">Korea → VN · PH · TH</span>
          </div>

          <h1 className="text-[42px] leading-[1.12] tracking-[-0.03em] font-bold text-ink m-0 mb-4">
            Send your salary home.<br />
            <span className="text-coral">Split. Instant. Free.</span>
          </h1>

          <p className="text-[14px] leading-[1.75] text-ink-soft mb-8">
            Set your family's share once.<br />
            Every payday, everyone gets paid — at the same time.
          </p>

          <div className="flex flex-col gap-3">
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
            {error && <p className="text-xs text-red font-semibold">{error}</p>}
          </div>

          <div className="flex items-center gap-6 mt-10 pt-8 border-t border-line">
            <Stat value="$0.0001" label="건당 수수료" />
            <div className="w-px h-7 bg-line" />
            <Stat value="3~5초" label="평균 정산" />
            <div className="w-px h-7 bg-line" />
            <Stat value="98%" label="vs SWIFT 절감" coral />
          </div>
        </div>

        {/* Divider */}
        <div className="bg-line mx-0" />

        {/* RIGHT — how it works */}
        <div className="pl-14 flex flex-col justify-center gap-8">
          <p className="text-[10px] font-bold tracking-[0.12em] text-ink-mute uppercase">
            How it works
          </p>
          <HowStep
            n="01"
            title="Korea On-ramp"
            sub="토스뱅크 → RLUSD"
            detail="KRW 급여를 RLUSD로 환전. 소액해외송금업 파트너 경유."
          />
          <HowStep
            n="02"
            title="1:N Split on XRPL"
            sub="One signature, all recipients"
            detail="가족별 비율대로 Payment 트랜잭션 병렬 제출. 3~5초 내 전원 확정."
          />
          <HowStep
            n="03"
            title="Local Cash-out"
            sub="VND / PHP / THB"
            detail="현지 e-wallet으로 즉시 입금. 가족이 별도 환전 없이 바로 사용."
          />
        </div>

      </div>
    </div>
  )
}

function Stat({ value, label, coral }: { value: string; label: string; coral?: boolean }) {
  return (
    <div>
      <div className={`text-[22px] font-bold tracking-[-0.02em] tabular-nums ${coral ? "text-coral" : "text-ink"}`}>
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
