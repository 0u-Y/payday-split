import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useSender } from "../contexts/SenderContext"
import { getFamilies, addFamily } from "../services/storage"
import { getClient } from "../xrpl/client"
import { createFundedWallet } from "../xrpl/wallet"
import { setRLUSDTrustLine } from "../xrpl/trustline"
import { getRLUSDBalance } from "../xrpl/query"
import type { Family } from "../types"

const PRESET_FAMILIES = [
  { label: "어머니", country: "VN", sharePercent: 40 },
  { label: "아버지", country: "VN", sharePercent: 30 },
  { label: "남동생", country: "VN", sharePercent: 15 },
  { label: "여동생", country: "VN", sharePercent: 15 },
]

export default function Send() {
  const navigate = useNavigate()
  const { address, isReady, isFirstTime } = useSender()

  const [families, setFamilies] = useState<Family[]>([])
  const [setupStep, setSetupStep] = useState<string>("")
  const [salaryKRW, setSalaryKRW] = useState("3000000")
  const [balance, setBalance] = useState<number | null>(null)
  const setupStartedRef = useRef(false)

  const exchangeRate = 1358

  // 가족 셋업
  useEffect(() => {
    if (!isReady) return
    if (setupStartedRef.current) return
    setupStartedRef.current = true

    ;(async () => {
      const existing = getFamilies()
      if (existing.length >= PRESET_FAMILIES.length) {
        setFamilies(existing)
        return
      }

      setSetupStep("가족 4명 셋업 중...")
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

  // 잔고 조회 (가족 셋업 끝난 후 + 페이지 진입 시)
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
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <div className="inline-block w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-semibold mb-2">데모 계정 준비 중</h2>
        <p className="text-slate-400 text-sm">
          XRPL Testnet 지갑 생성 + 초기 잔고 충전 (10~15초)
        </p>
      </div>
    )
  }

  if (setupStep) {
    return (
      <div className="max-w-md mx-auto px-6 py-24 text-center">
        <div className="inline-block w-12 h-12 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-semibold mb-2">가족 셋업 중</h2>
        <p className="text-slate-400 text-sm">{setupStep}</p>
        <p className="text-slate-500 text-xs mt-4">
          최초 1회만 진행됩니다 (약 1분)
        </p>
      </div>
    )
  }

  const totalShare = families.reduce((sum, f) => sum + f.sharePercent, 0)
  const salaryNum = parseFloat(salaryKRW) || 0
  const rlusdAmount = salaryNum / exchangeRate

  const insufficientBalance = balance !== null && balance < rlusdAmount

  const canSend =
    address &&
    families.length > 0 &&
    Math.abs(totalShare - 100) < 0.01 &&
    !insufficientBalance

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">송금</h1>
          <p className="text-slate-400">월급을 가족에게 분할 송금합니다</p>
        </div>
        {address && (
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase tracking-wide">
              내 지갑
            </div>
            <div className="font-mono text-sm text-slate-300 mb-1">
              {address.slice(0, 8)}...{address.slice(-6)}
            </div>
            {balance !== null && (
              <div className="text-sm">
                <span className="text-slate-500">잔고: </span>
                <span className="text-slate-200 font-medium">
                  {balance.toFixed(2)} RLUSD
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">월급 (KRW)</label>
        <input
          type="number"
          value={salaryKRW}
          onChange={(e) => setSalaryKRW(e.target.value)}
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-lg focus:outline-none focus:border-indigo-500"
        />
        <div className="mt-2 text-sm text-slate-400">
          ≈{" "}
          <span
            className={
              insufficientBalance
                ? "text-red-400 font-medium"
                : "text-slate-200 font-medium"
            }
          >
            {rlusdAmount.toFixed(2)} RLUSD
          </span>{" "}
          <span className="text-slate-500">(1 USD = {exchangeRate} KRW)</span>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">가족 목록</h2>
        <div className="space-y-2">
          {families.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between p-4 bg-slate-800 border border-slate-700 rounded-lg"
            >
              <div>
                <div className="font-medium">{f.label}</div>
                <div className="font-mono text-xs text-slate-500 mt-1">
                  {f.walletAddress.slice(0, 8)}...
                  {f.walletAddress.slice(-6)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{f.sharePercent}%</div>
                <div className="text-sm text-slate-400">
                  {((rlusdAmount * f.sharePercent) / 100).toFixed(2)} RLUSD
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 text-sm text-right">
          합계:{" "}
          <span
            className={
              Math.abs(totalShare - 100) < 0.01
                ? "text-green-400 font-semibold"
                : "text-amber-400 font-semibold"
            }
          >
            {totalShare.toFixed(0)}%
          </span>{" "}
          <span className="text-slate-500">/ 100%</span>
        </div>
      </div>

      <button
        disabled={!canSend}
        onClick={() =>
          navigate("/execute", {
            state: {
              rlusdAmount,
              salaryKRW: parseFloat(salaryKRW),
              exchangeRate,
            },
          })
        }
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed rounded-lg text-lg font-medium transition"
      >
        {!address
          ? "준비 중..."
          : insufficientBalance
            ? `잔고 부족 (보유 ${balance?.toFixed(2)}, 필요 ${rlusdAmount.toFixed(2)} RLUSD)`
            : `${rlusdAmount.toFixed(2)} RLUSD 분할 송금`}
      </button>
    </div>
  )
}