import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { Wallet } from "xrpl"
import sdk from "@crossmarkio/sdk"
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
import { USE_CROSSMARK } from "../config"
import {
  PRESEEDED_SENDER,
  PRESEEDED_FAMILY_REGISTERED,
  PRESEEDED_TRANSACTIONS,
  toFamily,
} from "../data/preseeded"

type SenderContextValue = {
  wallet: Wallet | null         // Crossmark 모드면 항상 null (외부 지갑이 서명)
  address: string | null
  isReady: boolean              // 송금자 사용 가능 (지갑 연결 후 true)
  isFirstTime: boolean
  isCrossmark: boolean          // 빌드 토글 결과
  isWalletConnected: boolean    // 시뮬레이션 플래그 (preseeded 모드에서만 의미)
  connectWallet: () => void     // 시뮬레이션 — preseeded 송금자 박고 isReady=true
  disconnectWallet: () => void  // 시뮬레이션 — sender 제거하고 isReady=false
  connectCrossmark: () => Promise<void>  // preseeded 모드에선 throw
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

// 가족·거래 preseeding은 두 모드 공통.
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
      source: "preseeded",
    })
    stored = getSender()!
  }

  return {
    wallet: walletFromSeed(stored.walletSeed!),
    isFirstTime,
  }
}

function PreseededSenderProvider({ children }: { children: ReactNode }) {
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

function CrossmarkSenderProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(() => {
    ensureFamilyAndTxPreseeded()
    const stored = getSender()
    // 이전 세션에서 Crossmark로 연결한 적이 있으면 주소 복원
    return stored?.source === "crossmark" ? stored.walletAddress : null
  })
  const [isFirstTime] = useState(() => !getSender())

  const connectCrossmark = useCallback(async () => {
    const resp = await sdk.async.signInAndWait()
    // 응답 우선, 폴백으로 SDK 메서드
    const respAddr =
      (resp as unknown as { response?: { data?: { address?: string } } })
        ?.response?.data?.address
    const addr = respAddr ?? sdk.methods.getAddress()
    if (!addr) throw new Error("Crossmark 주소를 받지 못했습니다")
    setSender({
      walletAddress: addr,
      createdAt: Date.now(),
      source: "crossmark",
    })
    setAddress(addr)
  }, [])

  const disconnectCrossmark = useCallback(() => {
    setAddress(null)
    // localStorage sender도 제거. 가족·거래는 유지.
    localStorage.removeItem("payday-split:sender")
  }, [])

  return (
    <SenderContext.Provider
      value={{
        wallet: null,
        address,
        isReady: !!address,
        isFirstTime,
        isCrossmark: true,
        isWalletConnected: !!address,
        connectWallet: noop,
        disconnectWallet: noop,
        connectCrossmark,
        disconnectCrossmark,
      }}
    >
      {children}
    </SenderContext.Provider>
  )
}

export function SenderProvider({ children }: { children: ReactNode }) {
  // USE_CROSSMARK는 빌드타임 상수 — 한 빌드 내에선 hooks 순서 안정.
  return USE_CROSSMARK ? (
    <CrossmarkSenderProvider>{children}</CrossmarkSenderProvider>
  ) : (
    <PreseededSenderProvider>{children}</PreseededSenderProvider>
  )
}

export function useSender() {
  return useContext(SenderContext)
}
