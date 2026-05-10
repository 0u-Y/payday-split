import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { Wallet } from "xrpl"
import {
  getSender,
  setSender,
  clearSender,
  getFamilies,
  addFamily,
  getTransactions,
  addTransaction,
  getWalletConnected,
  setWalletConnected,
} from "../services/storage"
import { walletFromSeed } from "../xrpl/wallet"
import {
  PRESEEDED_SENDER,
  PRESEEDED_FAMILY_REGISTERED,
  PRESEEDED_TRANSACTIONS,
  toFamily,
} from "../data/preseeded"

type SenderContextValue = {
  wallet: Wallet | null
  address: string | null
  isReady: boolean              // 송금자 사용 가능 (지갑 연결 후 true)
  isFirstTime: boolean
  isCrossmark: boolean          // 항상 false (Crossmark 코드패스 제거됨, 소비자 호환용)
  isWalletConnected: boolean    // 시뮬레이션 플래그
  connectWallet: () => void     // 시뮬레이션 — preseeded 송금자 박고 isReady=true
  disconnectWallet: () => void
  connectCrossmark: () => Promise<void>  // 호환용 throw
  disconnectCrossmark: () => void
}

const noopAsync = async () => {
  throw new Error("Crossmark 모드가 아닙니다")
}
const noop = () => {}

const SenderContext = createContext<SenderContextValue>({
  wallet: null,
  address: null,
  isReady: false,
  isFirstTime: false,
  isCrossmark: false,
  isWalletConnected: false,
  connectWallet: noop,
  disconnectWallet: noop,
  connectCrossmark: noopAsync,
  disconnectCrossmark: noop,
})

function ensureFamilyAndTxPreseeded(): void {
  if (getFamilies().length === 0) {
    for (const p of PRESEEDED_FAMILY_REGISTERED) addFamily(toFamily(p))
  }
  if (getTransactions().length === 0) {
    // addTransaction은 unshift라서 oldest부터 add해야 newest first 정렬 유지.
    for (const tx of PRESEEDED_TRANSACTIONS) addTransaction(tx)
  }
}

// preseeded 송금자 박기. 첫 박기면 isFirstTime=true.
function ensurePreseededSender(): { wallet: Wallet; isFirstTime: boolean } {
  let stored = getSender()
  let isFirstTime = false

  if (!stored) {
    isFirstTime = true
    setSender({
      walletAddress: PRESEEDED_SENDER.address,
      walletSeed: PRESEEDED_SENDER.seed,
      createdAt: Date.now(),
    })
    stored = getSender()!
  }

  return {
    wallet: walletFromSeed(stored.walletSeed!),
    isFirstTime,
  }
}

export function SenderProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => {
    ensureFamilyAndTxPreseeded()
    const connected = getWalletConnected()
    if (!connected) {
      return { wallet: null as Wallet | null, isFirstTime: !getSender(), isWalletConnected: false }
    }
    const { wallet, isFirstTime } = ensurePreseededSender()
    return { wallet: wallet as Wallet | null, isFirstTime, isWalletConnected: true }
  })

  const connectWallet = useCallback(() => {
    setWalletConnected(true)
    const { wallet, isFirstTime } = ensurePreseededSender()
    setState({ wallet, isFirstTime, isWalletConnected: true })
  }, [])

  const disconnectWallet = useCallback(() => {
    setWalletConnected(false)
    clearSender()
    setState((prev) => ({ wallet: null, isFirstTime: prev.isFirstTime, isWalletConnected: false }))
  }, [])

  return (
    <SenderContext.Provider
      value={{
        wallet: state.wallet,
        address: state.wallet?.address ?? null,
        isReady: state.isWalletConnected,
        isFirstTime: state.isFirstTime,
        isCrossmark: false,
        isWalletConnected: state.isWalletConnected,
        connectWallet,
        disconnectWallet,
        connectCrossmark: noopAsync,
        disconnectCrossmark: noop,
      }}
    >
      {children}
    </SenderContext.Provider>
  )
}

export function useSender() {
  return useContext(SenderContext)
}
