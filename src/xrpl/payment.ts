import { Client, Wallet } from "xrpl"
import { RLUSD_ISSUER, RLUSD_CURRENCY } from "../config"
import { getRLUSDBalance, hasRLUSDTrustLine } from "./query"

export type PaymentResult = {
    recipient: string
    amount: string
    status: "success" | "failed"
    txHash?: string
    error?: string
}

export async function sendRLUSD (
    client: Client,
    sender: Wallet,
    recipient: string,
    amount: string,
    sequence?: number,
): Promise<PaymentResult> {
    try {
        const tx: any = {
            TransactionType: "Payment" as const,
            Account: sender.address,
            Destination: recipient,
            Amount: {
                currency: RLUSD_CURRENCY,
                issuer: RLUSD_ISSUER,
                value: amount,
            },
        }

        if (sequence !== undefined) {
            tx.Sequence = sequence
        }

        const prepared = await client.autofill(tx)
        const signed = sender.sign(prepared)
        const result = await client.submitAndWait(signed.tx_blob)

        const meta = result.result.meta
        const txResult = 
            typeof meta === "object" && meta !== null && "TransactionResult" in meta ? meta.TransactionResult : "unknown"
        
        if (txResult === "tesSUCCESS") {
            return {
                recipient,
                amount,
                status: "success",
                txHash: result.result.hash,
            }
        }

        return {
            recipient,
            amount,
            status: "failed",
            error: String(txResult),
        }
    } catch (err) {
        return {
            recipient,
            amount,
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
        }
    }
}


export type Recipient = {
    address: string
    sharePercent: number
}

export async function splitPayment(
    client: Client,
    sender: Wallet,
    recipients: Recipient[],
    totalAmount: number,
): Promise<PaymentResult[]> {
    const totalShare = recipients.reduce((sum, r) => sum + r.sharePercent, 0)

    if (Math.abs(totalShare - 100) > 0.01) {
        throw new Error(`Share percentages must sum to 100, got ${totalShare}`)
    }

    const senderBalance = await getRLUSDBalance(client, sender.address)
    const requiredAmount = totalAmount * 1.005

    if (senderBalance < requiredAmount) {
        throw new Error(
            `Insufficient RLUSD balance. Required: ${requiredAmount.toFixed(2)} (incl. margin), Available: ${senderBalance}`,
        )
    }

    const trustLineChecks = await Promise.all(
        recipients.map(async (r) => ({
            address: r.address,
            hasTrustLine: await hasRLUSDTrustLine(client, r.address),
        })),
    )
    const missingTrustLines = trustLineChecks.filter((c) => !c.hasTrustLine)

    if (missingTrustLines.length > 0) {
        throw new Error(
            `Recipients missing RLUSD Trust Line: ${missingTrustLines.map((c) => c.address).join(", ")}`
        )
    }

    const accountInfo = await client.request({
        command: "account_info",
        account: sender.address,
        ledger_index: "validated",
    })
    const baseSequence = accountInfo.result.account_data.Sequence

    const promises = recipients.map((r, i) => {
        const amount = ((totalAmount * r.sharePercent) / 100).toFixed(2)
        return sendRLUSD(client, sender, r.address, amount, baseSequence + i)
    })
    const results = await Promise.allSettled(promises)

    return results.map((r, i) => {
        if (r.status === "fulfilled") {
            return r.value
        }
        return {
            recipient: recipients[i].address,
            amount: "0",
            status: "failed" as const,
            error: r.reason instanceof Error ? r.reason.message : String(r.reason)
        }
    })

}
