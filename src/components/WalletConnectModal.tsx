import { useEffect, useState } from "react"
import { ArrowLeft, Check, Lock, ShieldCheck, Wallet, X } from "lucide-react"
import { Button, Mono } from "./ui"
import { useSender } from "../contexts/SenderContext"
import { useWalletConnect } from "../contexts/WalletConnectContext"
import { PRESEEDED_SENDER } from "../data/preseeded"
import { shortAddr } from "../lib/format"

type Step = "select" | "permission" | "connecting" | "success"

export function WalletConnectModal() {
  const { isOpen, close, fireConnected } = useWalletConnect()
  const { connectWallet } = useSender()
  const [step, setStep] = useState<Step>("select")

  // 모달이 열릴 때마다 step 초기화
  useEffect(() => {
    if (isOpen) setStep("select")
  }, [isOpen])

  // connecting → success → fireConnected 자동 진행
  useEffect(() => {
    if (!isOpen) return
    if (step === "connecting") {
      const t = setTimeout(() => {
        connectWallet()
        setStep("success")
      }, 1000)
      return () => clearTimeout(t)
    }
    if (step === "success") {
      const t = setTimeout(() => {
        fireConnected()
      }, 500)
      return () => clearTimeout(t)
    }
  }, [step, isOpen, connectWallet, fireConnected])

  if (!isOpen) return null

  const isProcessing = step === "connecting" || step === "success"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 animate-overlay-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-connect-title"
    >
      <div className="bg-bg-raised border border-line rounded-[18px] w-full max-w-[440px] shadow-lift animate-modal-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-line">
          <div className="flex items-center gap-2">
            {step === "permission" && (
              <button
                type="button"
                onClick={() => setStep("select")}
                className="p-1 -ml-1 rounded-md text-ink-mute hover:text-ink hover:bg-bg-sunken transition cursor-pointer"
                aria-label="뒤로"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <Wallet size={18} className="text-coral" />
            <h2 id="wallet-connect-title" className="text-[15px] font-bold text-ink m-0">
              지갑 연결
            </h2>
          </div>
          {!isProcessing && (
            <button
              type="button"
              onClick={close}
              className="p-1 rounded-md text-ink-mute hover:text-ink hover:bg-bg-sunken transition cursor-pointer"
              aria-label="닫기"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {step === "select" && <SelectStep onSelect={() => setStep("permission")} />}
          {step === "permission" && (
            <PermissionStep
              onApprove={() => setStep("connecting")}
              onReject={close}
            />
          )}
          {step === "connecting" && <ConnectingStep />}
          {step === "success" && <SuccessStep />}
        </div>
      </div>
    </div>
  )
}

// =========================================
// Select
// =========================================
function SelectStep({ onSelect }: { onSelect: () => void }) {
  return (
    <>
      <p className="text-[13px] text-ink-soft m-0 mb-4 leading-[1.5]">
        송금을 위해 XRPL 지갑을 연결해주세요
      </p>
      <div className="flex flex-col gap-2">
        <WalletOption
          name="Crossmark"
          description="Chrome 확장 지갑"
          onClick={onSelect}
        />
      </div>
    </>
  )
}

function WalletOption({
  name,
  description,
  onClick,
}: {
  name: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] border border-line bg-bg-raised text-left transition hover:border-coral hover:bg-coral-faint cursor-pointer active:scale-[0.99]"
    >
      <div className="w-9 h-9 rounded-[10px] bg-bg-sunken flex items-center justify-center shrink-0">
        <Wallet size={18} className="text-coral" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-ink leading-tight">{name}</div>
        <div className="text-[12px] text-ink-mute mt-0.5">{description}</div>
      </div>
    </button>
  )
}

// =========================================
// Permission
// =========================================
function PermissionStep({
  onApprove,
  onReject,
}: {
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <>
      <p className="text-[13px] text-ink-soft m-0 mb-4 leading-[1.5]">
        다음 권한이 필요합니다
      </p>
      <div className="flex flex-col gap-2 mb-4">
        <PermissionRow icon={<ShieldCheck size={16} />} label="XRPL 계정 주소 읽기" />
        <PermissionRow icon={<Lock size={16} />} label="트랜잭션 서명 요청" />
        <PermissionRow icon={<Wallet size={16} />} label="토큰 잔고 조회" />
      </div>
      <div className="px-4 py-3 rounded-[10px] bg-bg-sunken border border-line mb-5">
        <div className="text-[11px] font-bold tracking-wider text-ink-mute mb-1">
          연결될 주소
        </div>
        <Mono size={13} className="text-ink font-semibold">
          {shortAddr(PRESEEDED_SENDER.address)}
        </Mono>
      </div>
      <div className="flex gap-2">
        <Button kind="secondary" size="md" onClick={onReject} className="flex-1">
          거부
        </Button>
        <Button kind="primary" size="md" onClick={onApprove} className="flex-1">
          승인
        </Button>
      </div>
    </>
  )
}

function PermissionRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-bg-sunken">
      <div className="text-sage flex items-center justify-center">{icon}</div>
      <div className="text-[13px] text-ink font-medium flex-1">{label}</div>
      <Check size={14} className="text-sage" />
    </div>
  )
}

// =========================================
// Connecting / Success
// =========================================
function ConnectingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      <div className="w-10 h-10 rounded-full border-[3px] border-line border-t-coral animate-spin" />
      <div className="text-[14px] text-ink-soft font-medium">
        Crossmark에 연결 중...
      </div>
    </div>
  )
}

function SuccessStep() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className="w-10 h-10 rounded-full bg-sage-soft flex items-center justify-center">
        <Check size={20} className="text-sage" strokeWidth={3} />
      </div>
      <div className="text-[14px] text-ink font-bold">연결되었습니다</div>
    </div>
  )
}
