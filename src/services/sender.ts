import { Wallet } from "xrpl"
import { getClient } from "../xrpl/client"
import { createFundedWallet, walletFromSeed } from "../xrpl/wallet"
import { setRLUSDTrustLine } from "../xrpl/trustline"
import { issueToken } from "../xrpl/issue"
import { getRLUSDBalance } from "../xrpl/query"
import { getSender, setSender } from "./storage"
import { ISSUER_SEED, USE_LOCAL_ISSUER } from "../config"

const REFILL_THRESHOLD = 10
const REFILL_AMOUNT = "100"

/**
 * 송금인 지갑을 보장. 없으면 새로 만들고, 있으면 복원.
 * RLUSD 잔고가 임계치 이하면 자동 충전 (테스트 모드만).
 */
export async function ensureSender(
  onProgress?: (msg: string) => void,
): Promise<Wallet> {
  const log = (msg: string) => {
    console.log("[ensureSender]", msg)
    onProgress?.(msg)
  }

  const stored = getSender()
  const client = await getClient()

  try {
    let wallet: Wallet

    if (stored) {
      log("기존 송금인 지갑 복원 중...")
      wallet = walletFromSeed(stored.walletSeed)
    } else {
      log("새 송금인 지갑 생성 중...")
      wallet = await createFundedWallet(client)
      log(`지갑 활성화 완료: ${wallet.address}`)

      log("RLUSD Trust Line 설정 중...")
      await setRLUSDTrustLine(client, wallet)

      setSender({
        walletAddress: wallet.address,
        walletSeed: wallet.seed!,
        createdAt: Date.now(),
      })
    }

    if (USE_LOCAL_ISSUER) {
      const balance = await getRLUSDBalance(client, wallet.address)
      log(`현재 RLUSD 잔고: ${balance}`)

      if (balance < REFILL_THRESHOLD) {
        log(`잔고 부족, ${REFILL_AMOUNT} RLUSD 자동 충전 중...`)
        const issuer = walletFromSeed(ISSUER_SEED)
        await issueToken(client, issuer, wallet.address, REFILL_AMOUNT)
        log("충전 완료")
      }
    }

    return wallet
  } finally {
    await client.disconnect()
  }
}