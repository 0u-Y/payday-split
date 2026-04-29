import "dotenv/config"

import { getClient } from "../xrpl/client"
import { createFundedWallet } from "../xrpl/wallet"

const client = await getClient()
const issuer = await createFundedWallet(client)

console.log("=== Issuer 지갑 ===")
console.log("Address:", issuer.address)
console.log("Seed:   ", issuer.seed)

console.log("\nDefaultRipple 플래그 활성화 중...")
const tx = {
  TransactionType: "AccountSet" as const,
  Account: issuer.address,
  SetFlag: 8,
}
const prepared = await client.autofill(tx)
const signed = issuer.sign(prepared)
const result = await client.submitAndWait(signed.tx_blob)

const meta = result.result.meta
const txResult =
  typeof meta === "object" && meta !== null && "TransactionResult" in meta
    ? meta.TransactionResult
    : "unknown"
console.log("Result:", txResult)

console.log("\n이 주소를 config.ts의 RLUSD_ISSUER로 박기")
console.log("   이 시드를 .env의 ISSUER_SEED로 저장")

await client.disconnect()