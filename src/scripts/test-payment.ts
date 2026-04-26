import { getClient } from "../xrpl/client"
import { createFundedWallet } from "../xrpl/wallet"
import { setRLUSDTrustLine } from "../xrpl/trustline"
import { sendRLUSD } from "../xrpl/payment"

const client = await getClient()
console.log("Connected")

console.log("\n[1] 송금인 지갑 생성")
const sender = await createFundedWallet(client)
console.log("Sender:", sender.address)

console.log("\n[2] 송금인 RLUSD Trust Line 설정")
await setRLUSDTrustLine(client, sender)
console.log("Trust Line set")

console.log("\n[3] 수취인 지갑 생성")
const recipient = await createFundedWallet(client)
console.log("Recipient:", recipient.address)

console.log("\n[4] 수취인 RLUSD Trust Line 설정")
await setRLUSDTrustLine(client, recipient)
console.log("Trust Line set")

console.log("\n[5] 송금인 RLUSD 충전 (tryrlusd.com 수동 처리 필요)")
console.log(`👉 https://tryrlusd.com 가서 다음 주소로 RLUSD 받아오기:`)
console.log(`   ${sender.address}`)
console.log(`30초 대기 후 자동 송금 시도...`)
await new Promise((r) => setTimeout(r, 30000))

console.log("\n[6] 송금인 → 수취인 RLUSD 10 송금")
const result = await sendRLUSD(client, sender, recipient.address, "10")
console.log("Result:", result)

if (result.txHash) {
  console.log(
    `Explorer: https://testnet.xrpl.org/transactions/${result.txHash}`,
  )
}

await client.disconnect()
console.log("\nDisconnected")