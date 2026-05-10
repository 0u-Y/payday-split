/**
 * 송금자(Anh) 지갑에 RLUSD를 충전하는 스크립트
 *
 * 사용법:
 *   npx tsx src/scripts/refill-sender.ts          <- 기본 10000 RLUSD
 *   npx tsx src/scripts/refill-sender.ts 5000     <- 금액 직접 지정
 */
import "dotenv/config"

import { getClient } from "../xrpl/client"
import { walletFromSeed } from "../xrpl/wallet"
import { issueToken } from "../xrpl/issue"
import { getRLUSDBalance } from "../xrpl/query"
import { ISSUER_SEED } from "../config"
import { PRESEEDED_SENDER } from "../data/preseeded"

const AMOUNT = process.argv[2] ?? "10000"

console.log("=== RLUSD 충전 스크립트 ===")
console.log(`대상:   ${PRESEEDED_SENDER.address}`)
console.log(`충전량: ${AMOUNT} RLUSD`)
console.log("")

const client = await getClient()

try {
  const before = await getRLUSDBalance(client, PRESEEDED_SENDER.address)
  console.log(`충전 전 잔고: ${before} RLUSD`)

  const issuer = walletFromSeed(ISSUER_SEED)
  await issueToken(client, issuer, PRESEEDED_SENDER.address, AMOUNT)

  const after = await getRLUSDBalance(client, PRESEEDED_SENDER.address)
  console.log(`충전 후 잔고: ${after} RLUSD`)
  console.log("")
  console.log("완료")
} finally {
  await client.disconnect()
}
