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