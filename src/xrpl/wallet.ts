import { Wallet, Client } from "xrpl"

export async function createFundedWallet(client: Client): Promise<Wallet> {
    const result = await client.fundWallet()
    return result.wallet
}

export function walletFromSeed(seed: string): Wallet {
    return Wallet.fromSeed(seed)
}