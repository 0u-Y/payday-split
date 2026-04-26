import { Client } from "xrpl"
import { TESTNET_URL } from "../config"


/**
 * XRPL Testnet에 연결된 Client 반환
 * 사용 후 반드시 disconnect() 호출
 */
export async function getClient(): Promise<Client> {
    const client = new Client(TESTNET_URL)
    await client.connect()
    return client
}