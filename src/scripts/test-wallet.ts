import { getClient } from "../xrpl/client"
import { createFundedWallet } from "../xrpl/wallet"

const client = await getClient()
console.log("Connected")

const wallet = await createFundedWallet(client)
console.log("Address:", wallet.address)
console.log("Seed:", wallet.seed)

await client.disconnect()
console.log("Disconnected")