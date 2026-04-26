import { Client, Wallet } from "xrpl"
import { RLUSD_ISSUER, RLUSD_CURRENCY, TRUST_LINE_LIMIT } from "../config"


export async function setRLUSDTrustLine(
    client: Client,
    wallet: Wallet,
) {
    const tx = {
        TransactionType: "TrustSet" as const,
        Account: wallet.address,
        LimitAmount: {
            currency: RLUSD_CURRENCY,
            issuer: RLUSD_ISSUER,
            value: TRUST_LINE_LIMIT,
        },
    }

    const prepared = await client.autofill(tx)
    const signed = wallet.sign(prepared)
    const result = await client.submitAndWait(signed.tx_blob)

    return result
}