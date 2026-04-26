import type { Family, TransactionRecord, SenderInfo } from "../types"

// =========================================
// Keys
// =========================================
const KEYS = {
  SENDER: "payday-split:sender",
  FAMILIES: "payday-split:families",
  TRANSACTIONS: "payday-split:transactions",
} as const

// =========================================
// Sender
// =========================================
export function getSender(): SenderInfo | null {
  const data = localStorage.getItem(KEYS.SENDER)
  return data ? JSON.parse(data) : null
}

export function setSender(sender: SenderInfo): void {
  localStorage.setItem(KEYS.SENDER, JSON.stringify(sender))
}

export function clearSender(): void {
  localStorage.removeItem(KEYS.SENDER)
}

// =========================================
// Families
// =========================================
export function getFamilies(): Family[] {
  const data = localStorage.getItem(KEYS.FAMILIES)
  return data ? JSON.parse(data) : []
}

export function addFamily(family: Family): void {
  const families = getFamilies()
  families.push(family)
  localStorage.setItem(KEYS.FAMILIES, JSON.stringify(families))
}

export function updateFamily(id: string, updates: Partial<Family>): void {
  const families = getFamilies()
  const idx = families.findIndex((f) => f.id === id)
  if (idx === -1) return
  families[idx] = { ...families[idx], ...updates }
  localStorage.setItem(KEYS.FAMILIES, JSON.stringify(families))
}

export function removeFamily(id: string): void {
  const families = getFamilies().filter((f) => f.id !== id)
  localStorage.setItem(KEYS.FAMILIES, JSON.stringify(families))
}

// =========================================
// Transactions
// =========================================
export function getTransactions(): TransactionRecord[] {
  const data = localStorage.getItem(KEYS.TRANSACTIONS)
  return data ? JSON.parse(data) : []
}

export function addTransaction(tx: TransactionRecord): void {
  const transactions = getTransactions()
  transactions.unshift(tx)
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions))
}

export function updateTransaction(
  id: string,
  updates: Partial<TransactionRecord>,
): void {
  const transactions = getTransactions()
  const idx = transactions.findIndex((t) => t.id === id)
  if (idx === -1) return
  transactions[idx] = { ...transactions[idx], ...updates }
  localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions))
}

// =========================================
// 전체 리셋 (디버그용)
// =========================================
export function clearAll(): void {
  localStorage.removeItem(KEYS.SENDER)
  localStorage.removeItem(KEYS.FAMILIES)
  localStorage.removeItem(KEYS.TRANSACTIONS)
}