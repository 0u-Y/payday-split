import { getClient } from "../xrpl/client"
import { walletFromSeed } from "../xrpl/wallet"
import { setRLUSDTrustLine } from "../xrpl/trustline"

const RECIPIENT_SEED = "sEdTYfNqMGSsqo6wtPqWDWXQpCoLPjg"

const client = await getClient()
const recipient = walletFromSeed(RECIPIENT_SEED)
console.log("Adding RLUSD trustline to:", recipient.address)

const result = await setRLUSDTrustLine(client, recipient)
const meta = result.result.meta
const txResult =
  typeof meta === "object" && meta !== null && "TransactionResult" in meta
    ? meta.TransactionResult
    : "unknown"
console.log("Result:", txResult)

await client.disconnect()