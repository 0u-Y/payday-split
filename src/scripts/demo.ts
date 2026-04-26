import {
    USE_LOCAL_ISSUER,
    ISSUER_SEED,
    SENDER_SEED,
    RLUSD_ISSUER,
  } from "../config"
  import { getClient } from "../xrpl/client"
  import { createFundedWallet, walletFromSeed } from "../xrpl/wallet"
  import { setRLUSDTrustLine } from "../xrpl/trustline"
  import { issueToken } from "../xrpl/issue"
  import { splitPayment } from "../xrpl/payment"
  
  const client = await getClient()
  console.log(`Connected · ${USE_LOCAL_ISSUER ? "테스트 모드 (자체 Issuer)" : "데모 모드 (실제 RLUSD)"}\n`)
  
  // ===== 송금인 셋업 =====
  let sender
  if (USE_LOCAL_ISSUER) {
    if (!ISSUER_SEED) throw new Error("ISSUER_SEED가 .env에 없음")
    const issuer = walletFromSeed(ISSUER_SEED)
    console.log("[Issuer]", issuer.address)
  
    sender = await createFundedWallet(client)
    console.log("[송금인 신규 생성]", sender.address)
    await setRLUSDTrustLine(client, sender)
    console.log("  Trust Line: OK")
    await issueToken(client, issuer, sender.address, "100")
    console.log("  100 RLUSD 발행 완료\n")
  } else {
    if (!SENDER_SEED) throw new Error("SENDER_SEED가 .env에 없음")
    sender = walletFromSeed(SENDER_SEED)
    console.log("[송금인 (사전 충전)]", sender.address)
    console.log("[Issuer]", RLUSD_ISSUER, "(공식 RLUSD)\n")
  }
  
  // ===== 가족 셋업 =====
  console.log("[가족 3명 지갑 생성 + Trust Line]")
  const family1 = await createFundedWallet(client)
  await setRLUSDTrustLine(client, family1)
  console.log("  가족 1 (어머니, 50%):", family1.address)
  
  const family2 = await createFundedWallet(client)
  await setRLUSDTrustLine(client, family2)
  console.log("  가족 2 (동생, 30%):", family2.address)
  
  const family3 = await createFundedWallet(client)
  await setRLUSDTrustLine(client, family3)
  console.log("  가족 3 (자녀, 20%):", family3.address)
  
  // ===== 분할 송금 =====
  console.log("\n[분할 송금] 30 RLUSD")
  const recipients = [
    { address: family1.address, sharePercent: 50 },
    { address: family2.address, sharePercent: 30 },
    { address: family3.address, sharePercent: 20 },
  ]
  const results = await splitPayment(client, sender, recipients, 30)
  
  console.log("\n=== 결과 ===")
  results.forEach((r, i) => {
    const emoji = r.status === "success" ? "✅" : "❌"
    console.log(
      `${emoji} 가족 ${i + 1}: ${r.amount} RLUSD → ${r.recipient.slice(0, 10)}...`,
    )
    if (r.txHash) {
      console.log(`   https://testnet.xrpl.org/transactions/${r.txHash}`)
    }
    if (r.error) {
      console.log(`   Error: ${r.error}`)
    }
  })
  
  const successCount = results.filter((r) => r.status === "success").length
  console.log(`\n총 ${successCount}/${results.length}건 성공`)
  
  await client.disconnect()
  console.log("Disconnected")