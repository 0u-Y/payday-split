import { useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { addFamily } from "../services/storage"
import { getClient } from "../xrpl/client"
import { verifyRLUSDTrustLine } from "../xrpl/query"
import { Button, Card, Mono } from "../components/ui"
import type { Family } from "../types"

const ROLES = ["어머니", "아버지", "남동생", "여동생", "배우자", "자녀"]
const COUNTRIES = [
  { code: "VN", label: "베트남" },
  { code: "PH", label: "필리핀" },
  { code: "TH", label: "태국" },
]

type Phase = "form" | "verifying" | "done"
type StepStatus = "pending" | "running" | "ok" | "fail"
type StepInfo = { status: StepStatus; result?: string; error?: string }

const PENDING: StepInfo = { status: "pending" }

const todayISO = () => new Date().toISOString().slice(0, 10)
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const shortAddr = (a: string) =>
  a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a

export default function FamilyNew() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>("form")

  const [name, setName] = useState("")
  const [role, setRole] = useState("")
  const [country, setCountry] = useState("")
  const [address, setAddress] = useState("")

  const [stepA, setStepA] = useState<StepInfo>(PENDING)
  const [stepB, setStepB] = useState<StepInfo>(PENDING)
  const [stepC, setStepC] = useState<StepInfo>(PENDING)
  const [stepD, setStepD] = useState<StepInfo>(PENDING)

  const isFormValid =
    name.trim().length > 0 &&
    role.length > 0 &&
    country.length > 0 &&
    address.trim().length > 0

  async function startVerification() {
    setPhase("verifying")
    setStepA({ status: "running" })
    setStepB(PENDING)
    setStepC(PENDING)
    setStepD(PENDING)

    // Step A: 실 ledger 조회 (최소 1초 표시)
    const start = Date.now()
    const client = await getClient()
    let trustResult: { exists: boolean; message: string }
    try {
      trustResult = await verifyRLUSDTrustLine(client, address.trim())
    } catch (err) {
      trustResult = {
        exists: false,
        message: err instanceof Error ? err.message : "ledger 조회 실패",
      }
    } finally {
      await client.disconnect()
    }
    const elapsed = Date.now() - start
    if (elapsed < 1000) await sleep(1000 - elapsed)

    if (!trustResult.exists) {
      setStepA({ status: "fail", error: trustResult.message })
      return
    }
    setStepA({ status: "ok", result: trustResult.message })

    // Step B: KYC mock (1.5s)
    setStepB({ status: "running" })
    await sleep(1500)
    setStepB({
      status: "ok",
      result:
        "발급자: Vietnam National ID Authority\nVC (Verifiable Credential) 발급 → off-chain 저장",
    })

    // Step C: DID mock (1s)
    setStepC({ status: "running" })
    await sleep(1000)
    const didShort = `did:xrpl:1:${shortAddr(address.trim())}`
    setStepC({
      status: "ok",
      result: `${didShort}\nDIDSet 트랜잭션으로 ledger 등록 · URI 필드: VC 참조`,
    })

    // Step D: relation mock (1s)
    setStepD({ status: "running" })
    await sleep(1000)
    setStepD({
      status: "ok",
      result: `DID 조회 → VC 검증\nAnh의 ${role} 검증됨`,
    })

    // 등록 + Done
    const family: Family = {
      id: crypto.randomUUID(),
      label: name.trim(),
      realName: name.trim(),
      walletAddress: address.trim(),
      walletSeed: "",
      sharePercent: 0,
      country,
      registeredAt: Date.now(),
      kycVerifiedAt: todayISO(),
      kycIssuer: "Vietnam National ID Authority",
      did: `did:xrpl:1:${address.trim()}`,
      relationVerifiedAt: todayISO(),
    }
    addFamily(family)

    setPhase("done")
    setTimeout(() => navigate("/send"), 700)
  }

  function backToForm() {
    setStepA(PENDING)
    setPhase("form")
  }

  return (
    <div className="px-14 py-8 max-w-[640px] mx-auto">
      <div className="mb-5">
        <Mono size={11} className="text-ink-mute tracking-[0.08em]">
          FAMILY · REGISTER
        </Mono>
        <h2 className="text-[26px] font-bold mt-1 mb-1 tracking-[-0.02em]">
          가족 등록
        </h2>
        <div className="text-[13px] text-ink-soft">
          XRPL Trust Line + KYC + DID로 신원과 관계를 검증합니다
        </div>
      </div>

      {phase === "form" && (
        <FormCard
          name={name}
          setName={setName}
          role={role}
          setRole={setRole}
          country={country}
          setCountry={setCountry}
          address={address}
          setAddress={setAddress}
          isFormValid={isFormValid}
          onSubmit={startVerification}
          onCancel={() => navigate("/send")}
        />
      )}

      {phase === "verifying" && (
        <>
          <div className="space-y-3 mb-4">
            <StepCard index="STEP A" title="XRPL Trust Line 검증" info={stepA} />
            <StepCard index="STEP B" title="베트남 KYC 인증" info={stepB} />
            <StepCard index="STEP C" title="XRPL DID 등록" info={stepC} />
            <StepCard index="STEP D" title="가족 관계 검증" info={stepD} />
          </div>
          {stepA.status === "fail" && (
            <Button
              kind="primary"
              size="lg"
              onClick={backToForm}
              className="w-full"
            >
              다시 입력
            </Button>
          )}
        </>
      )}

      {phase === "done" && (
        <Card padded={false} className="p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-sage flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-bold leading-none">✓</span>
          </div>
          <h3 className="text-lg font-bold mb-1">가족 등록 완료</h3>
          <p className="text-sm text-ink-soft">
            <strong className="text-ink">{name.trim()}</strong>을 비율 분할
            목록에 추가했습니다.
          </p>
        </Card>
      )}
    </div>
  )
}

function FormCard({
  name,
  setName,
  role,
  setRole,
  country,
  setCountry,
  address,
  setAddress,
  isFormValid,
  onSubmit,
  onCancel,
}: {
  name: string
  setName: (v: string) => void
  role: string
  setRole: (v: string) => void
  country: string
  setCountry: (v: string) => void
  address: string
  setAddress: (v: string) => void
  isFormValid: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <Card padded={false} className="p-6">
      <Field label="이름">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder=""
          autoComplete="off"
          className="w-full px-3.5 py-2.5 bg-bg-raised border border-line rounded-[10px] outline-none focus:border-coral text-sm font-kr"
        />
      </Field>

      <Field label="관계">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-bg-raised border border-line rounded-[10px] outline-none focus:border-coral text-sm font-kr"
        >
          <option value="">선택하세요</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </Field>

      <Field label="국가">
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full px-3.5 py-2.5 bg-bg-raised border border-line rounded-[10px] outline-none focus:border-coral text-sm font-kr"
        >
          <option value="">선택하세요</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="지갑 주소">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="r..."
          autoComplete="off"
          spellCheck={false}
          className="w-full px-3.5 py-2.5 bg-bg-raised border border-line rounded-[10px] outline-none focus:border-coral text-sm font-mono"
        />
      </Field>

      <div className="flex gap-2 mt-6">
        <Button kind="ghost" size="lg" onClick={onCancel} className="flex-1">
          취소
        </Button>
        <Button
          kind="coral"
          size="lg"
          disabled={!isFormValid}
          onClick={onSubmit}
          className="flex-[2]"
        >
          가족 인증 시작 →
        </Button>
      </div>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-xs text-ink-mute font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function StepCard({
  index,
  title,
  info,
}: {
  index: string
  title: string
  info: StepInfo
}) {
  return (
    <Card padded={false} className="p-5">
      <div className="flex items-start gap-4">
        <StatusIcon status={info.status} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <Mono size={11} className="text-coral font-bold">
              {index}
            </Mono>
            <span className="text-sm font-bold">{title}</span>
          </div>
          {info.status === "running" && (
            <div className="text-xs text-ink-mute mt-1.5">진행 중...</div>
          )}
          {info.status === "ok" && info.result && (
            <div className="text-xs text-ink-soft mt-1.5 whitespace-pre-line leading-[1.6]">
              {info.result}
            </div>
          )}
          {info.status === "fail" && info.error && (
            <div className="text-xs text-red mt-1.5 font-medium">
              {info.error}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "pending") {
    return <div className="w-7 h-7 rounded-full border-2 border-line shrink-0" />
  }
  if (status === "running") {
    return (
      <div className="w-7 h-7 rounded-full border-2 border-line border-t-coral animate-spin shrink-0" />
    )
  }
  if (status === "ok") {
    return (
      <div className="w-7 h-7 rounded-full bg-sage flex items-center justify-center shrink-0">
        <span className="text-white text-sm font-bold leading-none">✓</span>
      </div>
    )
  }
  return (
    <div className="w-7 h-7 rounded-full bg-red flex items-center justify-center shrink-0">
      <span className="text-white text-sm font-bold leading-none">✕</span>
    </div>
  )
}
