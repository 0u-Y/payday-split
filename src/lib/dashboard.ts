import { getFamilies, getTransactions } from "../services/storage"
import { FAMILY_PRESET } from "./family"
import type { TransactionRecord } from "../types"

const SETTLE_TIME_SEC = 3.4
const SWIFT_FEE_RATE = 0.07
const FALLBACK_COLOR = "#94A3B8"

export function colorForLabel(label: string): string {
  return FAMILY_PRESET.find((f) => f.label === label)?.color ?? FALLBACK_COLOR
}

export type DashboardKPI = {
  totalSentKRW: number
  totalSentRLUSD: number
  avgSettleTime: number
  vsSwiftSavings: number
  txCount: number
}

export function getDashboardKPI(): DashboardKPI {
  const txs = getTransactions()
  const totalSentKRW = txs.reduce((s, t) => s + t.totalAmountKRW, 0)
  const totalSentRLUSD = txs.reduce((s, t) => s + t.totalAmountRLUSD, 0)
  return {
    totalSentKRW,
    totalSentRLUSD,
    avgSettleTime: SETTLE_TIME_SEC,
    vsSwiftSavings: totalSentKRW * SWIFT_FEE_RATE,
    txCount: txs.length,
  }
}

export type MonthlyEntry = {
  month: string
  amount: number
  byFamily: Record<string, number>
}

export function getMonthlyTrend(): MonthlyEntry[] {
  const txs = getTransactions()
  const now = new Date()
  const months: MonthlyEntry[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    months.push({ month: key, amount: 0, byFamily: {} })
  }
  const idx = new Map(months.map((m, i) => [m.month, i]))

  for (const tx of txs) {
    const d = new Date(tx.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const i = idx.get(key)
    if (i === undefined) continue
    const m = months[i]
    m.amount += tx.totalAmountKRW
    for (const p of tx.payments) {
      const ratio = tx.totalAmountRLUSD > 0 ? p.amountRLUSD / tx.totalAmountRLUSD : 0
      m.byFamily[p.familyLabel] = (m.byFamily[p.familyLabel] ?? 0) + tx.totalAmountKRW * ratio
    }
  }
  return months
}

export type FamilyDistEntry = {
  familyId: string
  label: string
  color: string
  totalReceivedRLUSD: number
  totalReceivedKRW: number
  txCount: number
}

export function getFamilyDistribution(): FamilyDistEntry[] {
  const txs = getTransactions()
  const families = getFamilies()
  const familyByAddress = new Map(families.map((f) => [f.walletAddress, f]))
  const map = new Map<string, FamilyDistEntry>()

  for (const tx of txs) {
    for (const p of tx.payments) {
      const ratio = tx.totalAmountRLUSD > 0 ? p.amountRLUSD / tx.totalAmountRLUSD : 0
      const krw = tx.totalAmountKRW * ratio
      const address = p.recipientAddress
      const family = familyByAddress.get(address)
      const label = family?.label ?? p.familyLabel
      const id = family?.id ?? `addr-${address}`

      const e = map.get(address)
      if (e) {
        e.totalReceivedRLUSD += p.amountRLUSD
        e.totalReceivedKRW += krw
        e.txCount += 1
      } else {
        map.set(address, {
          familyId: id,
          label,
          color: colorForLabel(label),
          totalReceivedRLUSD: p.amountRLUSD,
          totalReceivedKRW: krw,
          txCount: 1,
        })
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => b.totalReceivedRLUSD - a.totalReceivedRLUSD,
  )
}

export function getRecentTxs(limit = 10): TransactionRecord[] {
  return getTransactions()
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit)
}
