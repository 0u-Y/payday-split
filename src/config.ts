// =========================================
// 공통
// =========================================
export const TESTNET_URL = "wss://s.altnet.rippletest.net:51233"
export const RLUSD_CURRENCY = "524C555344000000000000000000000000000000"
export const TRUST_LINE_LIMIT = "1000000"
export const EXPLORER_BASE = "https://testnet.xrpl.org"
export const EXCHANGE_RATE_KRW_USD = 1458



// 환경에 따라 env 가져오기
function getEnv(key: string): string {
    if (typeof import.meta !== "undefined" && (import.meta as any).env) {
      const viteKey = `VITE_${key}`
      const val = (import.meta as any).env[viteKey]
      if (val) return val as string
    }
    if (typeof globalThis !== "undefined" && (globalThis as any).process?.env) {
      return (globalThis as any).process.env[key] ?? ""
    }
    return ""
  }

// =========================================
// 데모용 (실제 RLUSD 사용)
// =========================================
// export const RLUSD_ISSUER = "rQhWct2fv4Vc4KRjRgMrxa8xPN9Zx9iLKV"
// export const ISSUER_SEED = ""
// export const SENDER_SEED = process.env.SENDER_SEED ?? ""
// export const USE_LOCAL_ISSUER = false



// =========================================
// 테스트용 (자체 Issuer)
// 팀원 공유, 개발용
// =========================================
export const RLUSD_ISSUER = "rwrU8pmM1CY1ojWF4KEicPTCbKKb7nCmBn"
export const ISSUER_SEED = getEnv("ISSUER_SEED")
export const SENDER_SEED = ""
export const USE_LOCAL_ISSUER = true