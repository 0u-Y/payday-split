import { getClient } from "../xrpl/client"
import { walletFromSeed } from "../xrpl/wallet"
import { getRLUSDBalance, hasRLUSDTrustLine } from "../xrpl/query"
import { ISSUER_SEED } from "../config"

const client = await getClient()

// Issuer 지갑으로 테스트 (Issuer는 Trust Line 자기에 안 가짐 = 잔고 0, hasTrustLine false 기대)
const issuer = walletFromSeed(ISSUER_SEED)
console.log(`Issuer ${issuer.address}`)
console.log(`  RLUSD 잔고: ${await getRLUSDBalance(client, issuer.address)}`)
console.log(`  Trust Line: ${await hasRLUSDTrustLine(client, issuer.address)}`)

await client.disconnect()