import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { getClient } from "../xrpl/client"
import { createFundedWallet } from "../xrpl/wallet"
import { setRLUSDTrustLine } from "../xrpl/trustline"
import { addFamily, getFamilies } from "../services/storage"
import type { Family } from "../types"

const COUNTRIES = [
  { code: "VN", label: "베트남" },
  { code: "PH", label: "필리핀" },
  { code: "TH", label: "태국" },
  { code: "ID", label: "인도네시아" },
  { code: "KH", label: "캄보디아" },
]

export default function FamilyNew() {
  const navigate = useNavigate()

  const [label, setLabel] = useState("")
  const [country, setCountry] = useState("VN")
  const [sharePercent, setSharePercent] = useState(50)
  const [isCreating, setIsCreating] = useState(false)
  const [status, setStatus] = useState("")

  // 기존 가족들의 비율 합 (남은 % 표시용)
  const existingShare = getFamilies().reduce((sum, f) => sum + f.sharePercent, 0)
  const remainingShare = 100 - existingShare

  async function handleCreate() {
    if (!label.trim()) {
      alert("이름(라벨)을 입력하세요")
      return
    }
    if (sharePercent <= 0 || sharePercent > 100) {
      alert("비율은 1~100 사이여야 합니다")
      return
    }
    if (existingShare + sharePercent > 100) {
      alert(`비율 합이 100%를 초과합니다. 남은 비율: ${remainingShare}%`)
      return
    }

    setIsCreating(true)
    const client = await getClient()

    try {
      setStatus("XRPL 지갑 생성 중...")
      const wallet = await createFundedWallet(client)

      setStatus("RLUSD Trust Line 설정 중...")
      const trustResult = await setRLUSDTrustLine(client, wallet)
      const meta = trustResult.result.meta
      const txHash =
        typeof meta === "object" && meta !== null && "TransactionResult" in meta
          ? trustResult.result.hash
          : undefined

      const family: Family = {
        id: crypto.randomUUID(),
        label: label.trim(),
        walletAddress: wallet.address,
        walletSeed: wallet.seed!,
        sharePercent,
        country,
        trustSetTxHash: txHash,
        registeredAt: Date.now(),
      }

      addFamily(family)
      setStatus("등록 완료")

      navigate("/send")
    } catch (err) {
      setStatus(`에러: ${err instanceof Error ? err.message : String(err)}`)
      setIsCreating(false)
    } finally {
      await client.disconnect()
    }
  }

  if (isCreating) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <div className="inline-block w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-semibold mb-2">가족 등록 중</h2>
        <p className="text-slate-400 text-sm">{status}</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <button
        onClick={() => navigate("/send")}
        className="text-slate-400 hover:text-white text-sm mb-6"
      >
        ← 돌아가기
      </button>

      <h1 className="text-2xl font-bold mb-2">가족 추가</h1>
      <p className="text-slate-400 mb-8">
        본국에 있는 가족 정보를 등록하세요. XRPL Testnet에 새 지갑을 만들고 RLUSD 받을 준비를 합니다.
      </p>

      <div className="space-y-5">
        {/* 라벨 */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">관계 / 이름</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="예: 어머니, 동생, 자녀"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* 국가 */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">거주 국가</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* 비율 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-slate-400">송금 비율</label>
            <span className="text-xs text-slate-500">
              남은 비율: {remainingShare}%
            </span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="100"
              value={sharePercent}
              onChange={(e) => setSharePercent(Number(e.target.value))}
              className="flex-1"
            />
            <div className="w-16 text-center">
              <span className="text-2xl font-bold">{sharePercent}</span>
              <span className="text-slate-400">%</span>
            </div>
          </div>
        </div>

        {/* 안내 */}
        <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-400">
          <div className="font-medium text-slate-300 mb-1">자동 처리되는 작업</div>
          <ul className="space-y-1 list-disc list-inside text-xs">
            <li>XRPL Testnet 지갑 생성 + 활성화</li>
            <li>RLUSD Trust Line 설정 (TrustSet 트랜잭션)</li>
            <li>온체인 등록으로 가족 화이트리스트 형성</li>
          </ul>
        </div>

        <button
          onClick={handleCreate}
          disabled={!label.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg text-lg font-medium transition"
        >
          가족 등록
        </button>
      </div>
    </div>
  )
}