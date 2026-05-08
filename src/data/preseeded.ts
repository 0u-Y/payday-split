import type { Family, TransactionRecord } from "../types"

// =========================================
// 사전 셋업 데이터 (시연용)
// =========================================
// 첫 진입 시 SenderContext가 localStorage에 자동 박음.
// 시연: "이미 가입한 사용자가 다시 로그인" 시뮬레이션.

export type PreseededWallet = {
  address: string
  seed: string
}

export type PreseededFamily = {
  id: string
  label: string
  realName: string
  role: string
  country: string
  share: number
  color: string
  address: string
  seed: string
  kycVerifiedAt?: string   // ISO date "YYYY-MM-DD"
  kycIssuer?: string
  did?: string
  registeredAt?: string    // ISO date "YYYY-MM-DD" (없으면 시연 중 신규 등록 대상)
}

// =========================================
// 송금자 (Anh — 베트남 출신 한국 근로자)
// =========================================
export const PRESEEDED_SENDER: PreseededWallet = {
  address: "rN4dj1MpaF7u8AQ6GJqcPoHttW5n71k6u7",
  seed: "sEdSYT4B2XcR8tMhRJJCzhrVBQJsAhv",
}

// =========================================
// 시연 시작 시 이미 등록된 가족 (3명)
// =========================================
export const PRESEEDED_FAMILY_REGISTERED: PreseededFamily[] = [
  {
    id: "preseeded-mom",
    label: "어머니",
    realName: "Tran Thi Mai",
    role: "Mom",
    country: "VN",
    share: 40,
    color: "#E86A4D",
    address: "rJtjYrNhepuUwinpyg5xz28fBhnL4sSGPC",
    seed: "sEdV48YNcj4d9WqqpnPgVED1oACiAFS",
    kycVerifiedAt: "2026-04-15",
    kycIssuer: "Vietnam National ID Authority",
    did: "did:xrpl:1:rJtjYrNhepuUwinpyg5xz28fBhnL4sSGPC",
    registeredAt: "2026-04-15",
  },
  {
    id: "preseeded-dad",
    label: "아버지",
    realName: "Tran Van Bao",
    role: "Dad",
    country: "VN",
    share: 30,
    color: "#1A2540",
    address: "rHibbdWywttGrMhxLZcV9hCZmSB4icUURd",
    seed: "sEdVYvF5XtK5RUzf39L2PEWAaBssS8g",
    kycVerifiedAt: "2026-04-15",
    kycIssuer: "Vietnam National ID Authority",
    did: "did:xrpl:1:rHibbdWywttGrMhxLZcV9hCZmSB4icUURd",
    registeredAt: "2026-04-15",
  },
  {
    id: "preseeded-brother",
    label: "남동생",
    realName: "Tran Van Hung",
    role: "Brother",
    country: "VN",
    share: 15,
    color: "#3F8A6E",
    address: "rGu1QxJpNCpP27qtRcVwLVVRP7q7DnBNuN",
    seed: "sEdVYLvYKvYKtFLBWuMYuL4Qd9Krs2u",
    kycVerifiedAt: "2026-04-20",
    kycIssuer: "Vietnam National ID Authority",
    did: "did:xrpl:1:rGu1QxJpNCpP27qtRcVwLVVRP7q7DnBNuN",
    registeredAt: "2026-04-20",
  },
]

// =========================================
// 시연 중 신규 등록할 가족 (1명, localStorage엔 박지 않음)
// =========================================
export const PRESEEDED_FAMILY_AVAILABLE: PreseededFamily[] = [
  {
    id: "preseeded-sister",
    label: "여동생",
    realName: "Tran Thi Linh",
    role: "Sister",
    country: "VN",
    share: 15,
    color: "#D69431",
    address: "rtwSJ4fd9ae9pAp8ztsEboDh8hASQYcXn",
    seed: "sEdSiye5EbQ19NodZ68avgbzUokXLL5",
  },
]

// =========================================
// PreseededFamily → Family 변환
// =========================================
export function toFamily(p: PreseededFamily): Family {
  return {
    id: p.id,
    label: p.label,
    walletAddress: p.address,
    walletSeed: p.seed,
    sharePercent: p.share,
    country: p.country,
    registeredAt: p.registeredAt
      ? new Date(p.registeredAt).getTime()
      : Date.now(),
    realName: p.realName,
    kycVerifiedAt: p.kycVerifiedAt,
    kycIssuer: p.kycIssuer,
    did: p.did,
  }
}

// =========================================
// 시연 시작 시 박을 거래 기록 (oldest → newest)
// 환율: 4-15, 4-30은 historical 1358, 4-22는 1458 (실제 localStorage 데이터 그대로)
// =========================================
const MOM = PRESEEDED_FAMILY_REGISTERED[0]
const DAD = PRESEEDED_FAMILY_REGISTERED[1]
const BRO = PRESEEDED_FAMILY_REGISTERED[2]
const SIS = PRESEEDED_FAMILY_AVAILABLE[0]

const ts = (iso: string) => new Date(iso).getTime()

export const PRESEEDED_TRANSACTIONS: TransactionRecord[] = [
  {
    id: "tx-preseeded-2026-04-15",
    totalAmountKRW: 10_000,
    totalAmountRLUSD: 7.36,
    exchangeRate: 1358,
    status: "completed",
    mode: "local_issuer",
    createdAt: ts("2026-04-15T09:00:00.000Z"),
    completedAt: ts("2026-04-15T09:00:03.400Z"),
    payments: [
      {
        familyId: MOM.id,
        familyLabel: MOM.label,
        recipientAddress: MOM.address,
        amountRLUSD: 2.95,
        txHash: "DA39A3EE5E6B4B0D3255BFEF95601890AFD80709BAFD80709AFD80709AFD8071",
        status: "success",
      },
      {
        familyId: DAD.id,
        familyLabel: DAD.label,
        recipientAddress: DAD.address,
        amountRLUSD: 2.21,
        txHash: "9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08",
        status: "success",
      },
      {
        familyId: BRO.id,
        familyLabel: BRO.label,
        recipientAddress: BRO.address,
        amountRLUSD: 1.10,
        txHash: "2C26B46B68FFC68FF99B453C1D30413413422D706483BFA0F98A5E886266E7AE",
        status: "success",
      },
      {
        familyId: SIS.id,
        familyLabel: SIS.label,
        recipientAddress: SIS.address,
        amountRLUSD: 1.10,
        txHash: "FCDE2B2EDBA56BF408601FB721FE9B5C338D10EE429EA04FAE5511B68FBF8FB9",
        status: "success",
      },
    ],
  },
  {
    id: "tx-preseeded-2026-04-22",
    totalAmountKRW: 10_000,
    totalAmountRLUSD: 6.86,
    exchangeRate: 1458,
    status: "completed",
    mode: "local_issuer",
    createdAt: ts("2026-04-22T09:00:00.000Z"),
    completedAt: ts("2026-04-22T09:00:03.400Z"),
    payments: [
      {
        familyId: MOM.id,
        familyLabel: MOM.label,
        recipientAddress: MOM.address,
        amountRLUSD: 2.74,
        txHash: "6B86B273FF34FCE19D6B804EFF5A3F5747ADA4EAA22F1D49C01E52DDB7875B4B",
        status: "success",
      },
      {
        familyId: DAD.id,
        familyLabel: DAD.label,
        recipientAddress: DAD.address,
        amountRLUSD: 2.06,
        txHash: "D4735E3A265E16EEE03F59718B9B5D03019C07D8B6C51F90DA3A666EEC13AB35",
        status: "success",
      },
      {
        familyId: BRO.id,
        familyLabel: BRO.label,
        recipientAddress: BRO.address,
        amountRLUSD: 1.03,
        txHash: "4E07408562BEDB8B60CE05C1DECFE3AD16B72230967DE01F640B7E4729B49FCE",
        status: "success",
      },
      {
        familyId: SIS.id,
        familyLabel: SIS.label,
        recipientAddress: SIS.address,
        amountRLUSD: 1.03,
        txHash: "4B227777D4DD1FC61C6F884F48641D02B4D121D3FD328CB08B5531FCACDABF8A",
        status: "success",
      },
    ],
  },
  {
    id: "tx-preseeded-2026-04-30",
    totalAmountKRW: 3_000_002,
    totalAmountRLUSD: 2209.13,
    exchangeRate: 1358,
    status: "completed",
    mode: "local_issuer",
    createdAt: ts("2026-04-30T09:00:00.000Z"),
    completedAt: ts("2026-04-30T09:00:03.400Z"),
    payments: [
      {
        familyId: MOM.id,
        familyLabel: MOM.label,
        recipientAddress: MOM.address,
        amountRLUSD: 883.65,
        txHash: "EF2D127DE37B942BAAD06145E54B0C619A1F22327B2EBBCFBEC78F5564AFE39D",
        status: "success",
      },
      {
        familyId: DAD.id,
        familyLabel: DAD.label,
        recipientAddress: DAD.address,
        amountRLUSD: 662.74,
        txHash: "E7F6C011776E8DB7CD330B54174FD76F7D0216B612387A5FFCFB81E6F0919683",
        status: "success",
      },
      {
        familyId: BRO.id,
        familyLabel: BRO.label,
        recipientAddress: BRO.address,
        amountRLUSD: 331.37,
        txHash: "7902699BE42C8A8E46FBBB4501726517E86B22C56A189F7625A6DA49081B2451",
        status: "success",
      },
      {
        familyId: SIS.id,
        familyLabel: SIS.label,
        recipientAddress: SIS.address,
        amountRLUSD: 331.37,
        txHash: "2C624232CDD221771294DFBB310AAE1865E45C82F6A14CD09BB46AECCFCFCEEC",
        status: "success",
      },
    ],
  },
]
