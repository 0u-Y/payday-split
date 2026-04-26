export type Family = {
    id: string
    label: string
    walletAddress: string
    walletSeed: string    // 데모용 보관 (실제론 사용자 지갑이라 시드 보관 X)
    sharePercent: number
    country: string
    trustSetTxHash?: string
    registeredAt: number
  }
  
  export type TransactionRecord = {
    id: string
    totalAmountKRW: number
    totalAmountRLUSD: number
    exchangeRate: number
    status: "pending" | "completed" | "partial" | "failed"
    mode: "local_issuer" | "real_rlusd"
    createdAt: number
    completedAt?: number
    payments: PaymentRecordItem[]
  }
  
  export type PaymentRecordItem = {
    familyId: string
    familyLabel: string
    recipientAddress: string
    amountRLUSD: number
    txHash?: string
    status: "success" | "failed"
    error?: string
  }
  
  export type SenderInfo = {
    walletAddress: string
    walletSeed: string
    createdAt: number
  }