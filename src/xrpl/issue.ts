import { Client, Wallet } from "xrpl"
import { RLUSD_ISSUER, RLUSD_CURRENCY } from "../config"

/**
 * Issuer가 지정한 계정에게 토큰을 발행 (Payment 트랜잭션).
 * 받는 쪽은 미리 Trust Line이 설정돼 있어야 함.
 */
export async function issueToken(
  client: Client,
  issuer: Wallet,
  recipient: string,
  amount: string,
) {
  if (issuer.address !== RLUSD_ISSUER) {
    throw new Error(
      `Issuer wallet address mismatch. Expected ${RLUSD_ISSUER}, got ${issuer.address}`,
    )
  }

  const tx = {
    TransactionType: "Payment" as const,
    Account: issuer.address,
    Destination: recipient,
    Amount: {
      currency: RLUSD_CURRENCY,
      issuer: issuer.address,
      value: amount,
    },
  }

  const prepared = await client.autofill(tx)
  const signed = issuer.sign(prepared)
  const result = await client.submitAndWait(signed.tx_blob)

  return result
}