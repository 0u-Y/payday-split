import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Wallet } from "xrpl"
import { getSender, setSender } from "../services/storage"
import { walletFromSeed, createFundedWallet } from "../xrpl/wallet"
import { setRLUSDTrustLine } from "../xrpl/trustline"
import { issueToken } from "../xrpl/issue"
import { getClient } from "../xrpl/client"
import { ISSUER_SEED, USE_LOCAL_ISSUER } from "../config"

type SenderContextValue = {
  wallet: Wallet | null      // 시그널: 트랜잭션 서명용
  address: string | null     // UI 표시용
  isReady: boolean           // 셋업 완료 여부
  isFirstTime: boolean       // 첫 방문 여부 (셋업 화면 표시용)
}

const SenderContext = createContext<SenderContextValue>({
  wallet: null,
  address: null,
  isReady: false,
  isFirstTime: false,
})

export function SenderProvider({ children }: { children: ReactNode }) {
  // localStorage에서 즉시 가져옴 (동기, 0ms)
  const stored = getSender()
  const [wallet, setWallet] = useState<Wallet | null>(
    stored ? walletFromSeed(stored.walletSeed) : null,
  )
  const [isReady, setIsReady] = useState(!!stored)
  const isFirstTime = !stored

  useEffect(() => {
    if (stored) return // 이미 있으면 셋업 안 함

    // 첫 방문 - 백그라운드로 셋업
    ;(async () => {
      const client = await getClient()
      try {
        const newWallet = await createFundedWallet(client)
        await setRLUSDTrustLine(client, newWallet)

        if (USE_LOCAL_ISSUER) {
          const issuer = walletFromSeed(ISSUER_SEED)
          await issueToken(client, issuer, newWallet.address, "5000")
        }

        setSender({
          walletAddress: newWallet.address,
          walletSeed: newWallet.seed!,
          createdAt: Date.now(),
        })

        setWallet(newWallet)
        setIsReady(true)
      } catch (err) {
        console.error("송금인 셋업 실패:", err)
      } finally {
        await client.disconnect()
      }
    })()
  }, [])

  return (
    <SenderContext.Provider
      value={{
        wallet,
        address: wallet?.address ?? null,
        isReady,
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