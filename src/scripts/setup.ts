import { getClient } from "../xrpl/client"
import { createFundedWallet } from "../xrpl/wallet"
import { setRLUSDTrustLine } from "../xrpl/trustline"

const client = await getClient()
console.log("Connected\n")

const sender = await createFundedWallet(client)
console.log("=== 송금인 ===")
console.log("Address:", sender.address)
console.log("Seed:   ", sender.seed)

await setRLUSDTrustLine(client, sender)
console.log("Trust Line: OK")

const recipient = await createFundedWallet(client)
console.log("\n=== 수취인 ===")
console.log("Address:", recipient.address)
console.log("Seed:   ", recipient.seed)

await setRLUSDTrustLine(client, recipient)
console.log("Trust Line: OK")

await client.disconnect()

console.log("\n👉 다음 단계:")
console.log("1. https://tryrlusd.com 가서 송금인 주소로 RLUSD 받기")
console.log(`   ${sender.address}`)
console.log("2. Explorer에서 잔고 확인:")
console.log(`   https://testnet.xrpl.org/accounts/${sender.address}`)