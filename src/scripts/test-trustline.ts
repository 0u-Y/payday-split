import { getClient } from "../xrpl/client"
import { createFundedWallet } from "../xrpl/wallet"
import { setRLUSDTrustLine } from "../xrpl/trustline"

const client = await getClient()
console.log("Connected")

const wallet = await createFundedWallet(client)
console.log("Wallet:", wallet.address)

console.log("Setting up RLUSD Trust Line...")
const result = await setRLUSDTrustLine(client, wallet)

const meta = result.result.meta
const txResult =
  typeof meta === "object" && meta !== null && "TransactionResult" in meta
    ? meta.TransactionResult
    : "unknown"

console.log("Result:", txResult)
console.log("Hash:", result.result.hash)
console.log(
  `Explorer: https://testnet.xrpl.org/transactions/${result.result.hash}`,
)

await client.disconnect()
console.log("Disconnected")