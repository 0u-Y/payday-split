import * as xrpl from "xrpl"

const SERVER_URL = "wss://s.altnet.rippletest.net:51233"
const client = new xrpl.Client(SERVER_URL)

await client.connect()
console.log("Connected to Testnet")

console.log("\nCreating a new wallet and funding it with Testnet XRP...")
const fund_result = await client.fundWallet()
const test_wallet = fund_result.wallet
console.log(`Address: ${test_wallet.address}`)
console.log(`Seed:    ${test_wallet.seed}`)
console.log(`Balance: ${fund_result.balance} XRP`)
console.log(`Explorer: https://testnet.xrpl.org/accounts/${test_wallet.address}`)

console.log("\nGetting account info...")
const response = await client.request({
    command: "account_info",
    account: test_wallet.address,
    ledger_index: "validated",
})

console.log(JSON.stringify(response, null, 2))

console.log("\nListening for ledger close events...")
await client.request({
  command: "subscribe",
  streams: ["ledger"],
})
client.on("ledgerClosed", (ledger) => {
  console.log(
    `Ledger #${ledger.ledger_index} validated with ${ledger.txn_count} transactions`,
  )
})

setTimeout(async () => {
    await client.disconnect()
    console.log("\nDisconnected")
  }, 10000)