import { getClient } from "../xrpl/client"
import { walletFromSeed } from "../xrpl/wallet"
import { sendRLUSD } from "../xrpl/payment"

const SENDER_SEED = "sEdTo4mK6BPku6pesUX8DXSSoF19W7W"
const RECIPIENT_ADDRESS = "rpjjiXYdRCHWK3Ue7xVpthVvZvLdy731BZ"

const client = await getClient()
console.log("Connected")

const sender = walletFromSeed(SENDER_SEED)
console.log("Sender:", sender.address)

console.log("\nSending 5 RLUSD...")
const result = await sendRLUSD(client, sender, RECIPIENT_ADDRESS, "5")
console.log("Result:", result)

if (result.txHash) {
  console.log(
    `Explorer: https://testnet.xrpl.org/transactions/${result.txHash}`,
  )
}

await client.disconnect()
console.log("Disconnected")