import { createContext, useContext, useState, type ReactNode } from "react"
import { Wallet } from "xrpl"
import {
  getSender,
  setSender,
  getFamilies,
  addFamily,
  getTransactions,
  addTransaction,
} from "../services/storage"
import { walletFromSeed } from "../xrpl/wallet"
import {
  PRESEEDED_SENDER,
  PRESEEDED_FAMILY_REGISTERED,
  PRESEEDED_TRANSACTIONS,
  toFamily,
} from "../data/preseeded"

type SenderContextValue = {
  wallet: Wallet | null      // 시그널: 트랜잭션 서명용
  address: string | null     // UI 표시용
  isReady: boolean           // 셋업 완료 여부
  isFirstTime: boolean       // 첫 방문 여부
}

const SenderContext = createContext<SenderContextValue>({
  wallet: null,
  address: null,
  isReady: false,
  isFirstTime: false,
})

// 첫 진입이면 사전 셋업 데이터를 localStorage에 즉시 박는다.
// "이미 가입한 사용자가 다시 로그인" 시뮬레이션 — 셋업 대기 0초.
function ensurePreseeded(): { wallet: Wallet; isFirstTime: boolean } {
  let stored = getSender()
  let isFirstTime = false

  if (!stored) {
    isFirstTime = true

    setSender({
      walletAddress: PRESEEDED_SENDER.address,
      walletSeed: PRESEEDED_SENDER.seed,
      createdAt: Date.now(),
    })

    if (getFamilies().length === 0) {
      for (const p of PRESEEDED_FAMILY_REGISTERED) {
        addFamily(toFamily(p))
      }
    }

    if (getTransactions().length === 0) {
      // addTransaction은 unshift라서 최신이 [0]. oldest부터 add해야 newest first 정렬 유지.
      for (const tx of PRESEEDED_TRANSACTIONS) {
        addTransaction(tx)
      }
    }

    stored = getSender()!
  }

  return {
    wallet: walletFromSeed(stored.walletSeed),
    isFirstTime,
  }
}

export function SenderProvider({ children }: { children: ReactNode }) {
  const [{ wallet, isFirstTime }] = useState(() => ensurePreseeded())

  return (
    <SenderContext.Provider
      value={{
        wallet,
        address: wallet.address,
        isReady: true,
        isFirstTime,
      }}
    >
      {children}
    </SenderContext.Provider>
  )
}

export function useSender() {
  return useContext(SenderContext)
}
