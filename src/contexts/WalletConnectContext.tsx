import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"

type OpenOptions = {
  onConnected?: () => void
}

type WalletConnectContextValue = {
  isOpen: boolean
  open: (opts?: OpenOptions) => void
  close: () => void
  // 모달이 내부 시뮬레이션을 마치고 호출. 등록된 콜백 실행 + 닫기.
  fireConnected: () => void
}

const WalletConnectContext = createContext<WalletConnectContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  fireConnected: () => {},
})

export function WalletConnectProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const onConnectedRef = useRef<(() => void) | null>(null)

  const open = useCallback((opts?: OpenOptions) => {
    onConnectedRef.current = opts?.onConnected ?? null
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    onConnectedRef.current = null
  }, [])

  const fireConnected = useCallback(() => {
    const cb = onConnectedRef.current
    onConnectedRef.current = null
    setIsOpen(false)
    if (cb) cb()
  }, [])

  return (
    <WalletConnectContext.Provider value={{ isOpen, open, close, fireConnected }}>
      {children}
    </WalletConnectContext.Provider>
  )
}

export function useWalletConnect() {
  return useContext(WalletConnectContext)
}
