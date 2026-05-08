import { clearAll } from "../services/storage"
import { getClient } from "../xrpl/client"
import { walletFromSeed } from "../xrpl/wallet"
import { hasRLUSDTrustLine } from "../xrpl/query"
import { setRLUSDTrustLine } from "../xrpl/trustline"
import { PRESEEDED_FAMILY_AVAILABLE } from "../data/preseeded"

export function resetAllData(): void {
  clearAll()
  window.location.reload()
}

// 시연 사전 준비: 여동생 지갑 활성화 + RLUSD Trust Line 설정
// 멱등 — 이미 셋업된 상태에서 재실행해도 안전.
export async function setupSister(): Promise<void> {
  const sister = PRESEEDED_FAMILY_AVAILABLE[0]
  const wallet = walletFromSeed(sister.seed)
  const client = await getClient()

  let activated = false
  let trustLineSet = false

  try {
    // 1) 활성화 확인
    try {
      await client.request({
        command: "account_info",
        account: wallet.address,
        ledger_index: "validated",
      })
      activated = true
      console.log(`[setupSister] ${wallet.address} 이미 활성화됨`)
    } catch {
      console.log(`[setupSister] ${wallet.address} 활성화 시작...`)
      await client.fundWallet(wallet)
      activated = true
      console.log(`[setupSister] 활성화 완료`)
    }

    // 2) Trust Line 확인
    const exists = await hasRLUSDTrustLine(client, wallet.address)
    if (exists) {
      trustLineSet = true
      console.log(`[setupSister] RLUSD Trust Line 이미 설정됨`)
    } else {
      console.log(`[setupSister] RLUSD Trust Line 설정 시작...`)
      await setRLUSDTrustLine(client, wallet)
      trustLineSet = true
      console.log(`[setupSister] Trust Line 설정 완료`)
    }

    console.log(
      `[setupSister] ✓ 완료 — address: ${wallet.address}, activated: ${activated}, trustLine: ${trustLineSet}`,
    )
  } catch (err) {
    console.error(
      `[setupSister] ✗ 실패 — activated: ${activated}, trustLine: ${trustLineSet}`,
      err,
    )
  } finally {
    await client.disconnect()
  }
}

if (import.meta.env.DEV && typeof window !== "undefined") {
  ;(
    window as unknown as {
      resetAllData: typeof resetAllData
      setupSister: typeof setupSister
    }
  ).resetAllData = resetAllData
  ;(
    window as unknown as {
      resetAllData: typeof resetAllData
      setupSister: typeof setupSister
    }
  ).setupSister = setupSister

  console.log(
    "[devtools] window.resetAllData() — localStorage 초기화 + 페이지 새로고침",
  )
  console.log(
    "[devtools] window.setupSister() — 여동생 지갑 활성화 + RLUSD Trust Line 설정 (멱등)",
  )
}
