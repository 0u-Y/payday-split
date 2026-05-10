import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button, Card, Mono } from "../components/ui"
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

  // preseeded 모드 + 미연결: 모달 띄우고 승인 후 /send 이동
  const handleStartSendFromUnconnected = () => {
    open({ onConnected: () => navigate("/send") })
  }

  return (
    <div className="px-16 pt-20 pb-16">
      {/* Hero — 가운데 정렬 */}
      <div className="max-w-[900px] mx-auto text-center">
        <h1 className="text-[80px] leading-[1.05] tracking-[-0.035em] font-extrabold text-ink m-0">
          월급 하나로,
          <br />
          가족 모두에게.
        </h1>
        <p className="text-[20px] leading-[1.55] text-ink-soft mt-7 mb-10 font-medium">
          한국에서 일하는 외국인 근로자가 본국 가족에게
          <br />
          <strong className="text-ink">한 번의 송금으로</strong> XRPL 위에서 자동 분할.
        </p>

        <div className="flex gap-3 mb-3 justify-center">
          {showCrossmarkConnectButton ? (
            <Button
              kind="primary"
              size="lg"
              onClick={handleCrossmarkConnect}
              disabled={connecting}
            >
              {connecting ? "Crossmark 연결 중…" : "Crossmark로 시작 →"}
            </Button>
          ) : !isCrossmark && !isWalletConnected ? (
            <Button kind="primary" size="lg" onClick={handleStartSendFromUnconnected}>
              송금 시작 →
            </Button>
          ) : (
            <Link to="/send">
              <Button kind="primary" size="lg">
                송금 시작 →
              </Button>
            </Link>
          )}
        </div>
        {error && (
          <div className="text-xs text-red font-semibold mb-6">{error}</div>
        )}
        <div className="mb-12" />

        <div className="flex gap-12 pt-8 border-t border-line justify-center">
          <Stat top="$0.0001" label="건당 수수료" />
          <Stat top="3.4초" label="평균 정산" />
          <Stat top="vs SWIFT" label="98% 절감" coral />
        </div>
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
        className={`text-[36px] font-bold tracking-[-0.02em] tabular-nums ${
          coral ? "text-coral" : "text-ink"
        }`}
      >
        {top}
      </div>
      <div className="text-sm text-ink-mute mt-1 font-medium">{label}</div>
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