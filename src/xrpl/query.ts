import { Client } from "xrpl"
import { RLUSD_ISSUER, RLUSD_CURRENCY } from "../config"



/**
 * 지정 계정의 RLUSD 잔고 조회
 * Trust Line 없으면 0 반환
 * @param client 
 * @param address 
 * @returns 
 */
export async function getRLUSDBalance(
    client: Client,
    address: string,
): Promise<number> {
    const response = await client.request({
        command: "account_lines",
        account: address,
        ledger_index: "validated",
    })

    const rlusdLine = response.result.lines.find(
        (line) =>
            line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER,
    )

    return rlusdLine ? parseFloat(rlusdLine.balance) : 0
}



/**
 * 지정 계정이 RLUSD Trust Line을 갖고 있는지 확인
 * @param client
 * @param address
 * @returns
 */
export async function hasRLUSDTrustLine(
    client: Client,
    address: string,
): Promise<boolean> {
    const response = await client.request({
        command: "account_lines",
        account: address,
        ledger_index: "validated",
    })

    return response.result.lines.some(
        (line) =>
            line.currency === RLUSD_CURRENCY && line.account === RLUSD_ISSUER,
    )
}



/**
 * 가족 등록 흐름용 Trust Line 검증
 * - exists: Trust Line 존재 여부
 * - message: UI 표시용 메시지 (성공/실패 사유)
 */
export async function verifyRLUSDTrustLine(
    client: Client,
    address: string,
): Promise<{ exists: boolean; message: string }> {
    try {
        const exists = await hasRLUSDTrustLine(client, address)
        return {
            exists,
            message: exists
                ? "RLUSD Trust Line 확인됨"
                : "이 주소는 RLUSD Trust Line이 없습니다",
        }
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        if (errMsg.includes("actNotFound") || errMsg.includes("Account not found")) {
            return {
                exists: false,
                message: "이 주소는 XRPL Testnet에 활성화되지 않았습니다",
            }
        }
        return {
            exists: false,
            message: "유효하지 않은 XRPL 주소입니다",
        }
    }
}