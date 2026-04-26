import { useState } from "react"
import { Wallet } from "xrpl"
import { getClient } from "../xrpl/client"
import { createFundedWallet, walletFromSeed } from "../xrpl/wallet"
import { setRLUSDTrustLine } from "../xrpl/trustline"
import { issueToken } from "../xrpl/issue"
import { splitPayment, type PaymentResult } from "../xrpl/payment"
import { ISSUER_SEED } from "../config"

type Family = {
  label: string
  sharePercent: number
  wallet: Wallet
}

type Step = "idle" | "setup" | "ready" | "sending" | "done"

const FAMILY_CONFIG = [
  { label: "어머니", sharePercent: 50, emoji: "👩" },
  { label: "동생", sharePercent: 30, emoji: "👦" },
  { label: "자녀", sharePercent: 20, emoji: "👶" },
]

export default function Demo() {
  const [step, setStep] = useState<Step>("idle")
  const [log, setLog] = useState<string[]>([])
  const [sender, setSender] = useState<Wallet | null>(null)
  const [family, setFamily] = useState<Family[]>([])
  const [results, setResults] = useState<PaymentResult[]>([])
  const [totalAmount, setTotalAmount] = useState("30")

  const append = (line: string) => setLog((prev) => [...prev, line])

  async function handleSetup() {
    setStep("setup")
    setLog([])
    setResults([])
    setSender(null)
    setFamily([])

    const client = await getClient()
    try {
      append("XRPL Testnet 연결 완료")
      const issuer = walletFromSeed(ISSUER_SEED)
      append(`Issuer: ${issuer.address}`)

      append("송금인 지갑 생성 중...")
      const newSender = await createFundedWallet(client)
      append(`송금인: ${newSender.address}`)

      append("송금인 RLUSD Trust Line 설정 중...")
      await setRLUSDTrustLine(client, newSender)

      append("송금인에게 100 RLUSD 발행 중...")
      await issueToken(client, issuer, newSender.address, "100")
      append("발행 완료")

      append("가족 3명 지갑 생성 중...")
      const newFamily: Family[] = []
      for (const f of FAMILY_CONFIG) {
        const w = await createFundedWallet(client)
        await setRLUSDTrustLine(client, w)
        newFamily.push({ label: f.label, sharePercent: f.sharePercent, wallet: w })
        append(`${f.label} (${f.sharePercent}%): ${w.address}`)
      }

      setSender(newSender)
      setFamily(newFamily)
      setStep("ready")
    } catch (err) {
      append(`에러: ${err instanceof Error ? err.message : String(err)}`)
      setStep("idle")
    } finally {
      await client.disconnect()
    }
  }

  async function handleSplit() {
    if (!sender) return
    const amount = parseFloat(totalAmount)
    if (isNaN(amount) || amount <= 0) {
      append("올바른 금액을 입력하세요")
      return
    }
    setStep("sending")
    setResults([])
    append(`\n${totalAmount} RLUSD 분할 송금 시작...`)

    const client = await getClient()
    try {
      const recipients = family.map((f) => ({
        address: f.wallet.address,
        sharePercent: f.sharePercent,
      }))
      const res = await splitPayment(client, sender, recipients, amount)
      setResults(res)
      const successCount = res.filter((r) => r.status === "success").length
      append(`결과: ${successCount}/${res.length}건 성공`)
      setStep("done")
    } catch (err) {
      append(`에러: ${err instanceof Error ? err.message : String(err)}`)
      setStep("ready")
    } finally {
      await client.disconnect()
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.title}>Payday Split</h1>
          <p style={styles.subtitle}>XRPL 1:N 분할 송금 데모 · Testnet</p>
        </header>

        {/* 컨트롤 */}
        <div style={styles.controls}>
          <button
            onClick={handleSetup}
            disabled={step === "setup" || step === "sending"}
            style={{
              ...styles.btn,
              ...(step === "setup" || step === "sending" ? styles.btnDisabled : {}),
            }}
          >
            {step === "setup" ? "셋업 중..." : step === "idle" ? "1. 새 데모 시작" : "다시 셋업"}
          </button>

          {(step === "ready" || step === "done" || step === "sending") && (
            <>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                style={styles.input}
              />
              <button
                onClick={handleSplit}
                disabled={step === "sending"}
                style={{ ...styles.btn, ...styles.btnPrimary }}
              >
                2. {totalAmount} RLUSD 분할 송금
              </button>
            </>
          )}
        </div>
        {sender && (
          <div style={styles.flowSection}>

            <div style={styles.senderCard}>
              <div style={styles.cardLabel}>송금인</div>
              <div style={styles.senderAddress}>{shortAddr(sender.address)}</div>
              <div style={styles.balance}>
                {step === "done"
                  ? `${(100 - parseFloat(totalAmount)).toFixed(2)} RLUSD`
                  : "100.00 RLUSD"}
              </div>
            </div>

            {/* 화살표 + 송금 정보 */}
            <div style={styles.arrowWrapper}>
              <div style={styles.arrowLine} />
              <div
                style={{
                  ...styles.arrowAmount,
                  ...(step === "sending" ? styles.arrowSending : {}),
                }}
              >
                {step === "sending" ? "전송 중..." : `${totalAmount} RLUSD`}
              </div>
              <div style={styles.arrowDown}>↓</div>
            </div>

            {/* 가족 그리드 */}
            <div style={styles.familyGrid}>
              {family.map((f, i) => {
                const result = results[i]
                const expectedAmount = ((parseFloat(totalAmount) * f.sharePercent) / 100).toFixed(2)
                const statusColor =
                  result?.status === "success"
                    ? "#10b981"
                    : result?.status === "failed"
                      ? "#ef4444"
                      : step === "sending"
                        ? "#fbbf24"
                        : "#6b7280"

                return (
                  <div
                    key={f.wallet.address}
                    style={{
                      ...styles.familyCard,
                      borderColor: statusColor,
                    }}
                  >
                    <div style={styles.familyEmoji}>
                      {FAMILY_CONFIG[i].emoji}
                    </div>
                    <div style={styles.familyLabel}>{f.label}</div>
                    <div style={styles.familyShare}>{f.sharePercent}%</div>
                    <div style={styles.familyAddress}>
                      {shortAddr(f.wallet.address)}
                    </div>
                    <div
                      style={{
                        ...styles.familyAmount,
                        color: statusColor,
                      }}
                    >
                      {result
                        ? result.status === "success"
                          ? `+ ${result.amount}`
                          : "실패"
                        : step === "sending"
                          ? "..."
                          : `${expectedAmount}`}{" "}
                      <span style={styles.amountUnit}>RLUSD</span>
                    </div>
                    {result?.txHash && (
                      <a
                        href={`https://testnet.xrpl.org/transactions/${result.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.explorerLink}
                      >
                        Explorer ↗
                      </a>
                    )}
                    {result?.error && (
                      <div style={styles.errorText}>{result.error}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 로그 */}
        {log.length > 0 && (
          <details style={styles.logSection}>
            <summary style={styles.logSummary}>로그 ({log.length}줄)</summary>
            <pre style={styles.logPre}>{log.join("\n")}</pre>
          </details>
        )}
      </div>
    </div>
  )
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#e2e8f0",
    fontFamily: "system-ui, sans-serif",
    padding: "2rem 1rem",
  },
  container: {
    maxWidth: 960,
    margin: "0 auto",
  },
  header: {
    marginBottom: "2rem",
    textAlign: "center",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 700,
    margin: 0,
    color: "#f1f5f9",
  },
  subtitle: {
    color: "#94a3b8",
    margin: "0.5rem 0 0",
    fontSize: "0.95rem",
  },
  controls: {
    display: "flex",
    gap: "0.75rem",
    justifyContent: "center",
    marginBottom: "2.5rem",
    flexWrap: "wrap",
  },
  btn: {
    padding: "0.7rem 1.25rem",
    background: "#334155",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 500,
  },
  btnPrimary: {
    background: "#6366f1",
  },
  btnDisabled: {
    background: "#475569",
    cursor: "not-allowed",
    opacity: 0.6,
  },
  input: {
    width: 90,
    padding: "0.6rem 0.75rem",
    background: "#1e293b",
    color: "#f1f5f9",
    border: "1px solid #334155",
    borderRadius: 6,
    fontSize: "0.95rem",
    textAlign: "center",
  },
  flowSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 0,
  },
  senderCard: {
    background: "#1e293b",
    border: "2px solid #6366f1",
    borderRadius: 12,
    padding: "1.25rem 2rem",
    textAlign: "center",
    minWidth: 280,
  },
  cardLabel: {
    fontSize: "0.8rem",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.4rem",
  },
  senderAddress: {
    fontFamily: "ui-monospace, monospace",
    fontSize: "0.9rem",
    color: "#cbd5e1",
    marginBottom: "0.4rem",
  },
  balance: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#f1f5f9",
  },
  arrowWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: "0.5rem 0",
    position: "relative",
  },
  arrowLine: {
    width: 2,
    height: 30,
    background: "#475569",
  },
  arrowAmount: {
    background: "#1e293b",
    border: "1px solid #475569",
    borderRadius: 20,
    padding: "0.4rem 1rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#f1f5f9",
    margin: "0.5rem 0",
  },
  arrowSending: {
    background: "#fbbf24",
    color: "#0f172a",
    borderColor: "#fbbf24",
  },
  arrowDown: {
    fontSize: "1.5rem",
    color: "#475569",
    lineHeight: 1,
  },
  familyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
    width: "100%",
    marginTop: "1rem",
  },
  familyCard: {
    background: "#1e293b",
    border: "2px solid",
    borderRadius: 12,
    padding: "1.25rem 1rem",
    textAlign: "center",
    transition: "border-color 0.3s",
  },
  familyEmoji: {
    fontSize: "2rem",
    marginBottom: "0.5rem",
  },
  familyLabel: {
    fontSize: "1.1rem",
    fontWeight: 600,
    color: "#f1f5f9",
    marginBottom: "0.2rem",
  },
  familyShare: {
    fontSize: "0.85rem",
    color: "#94a3b8",
    marginBottom: "0.6rem",
  },
  familyAddress: {
    fontFamily: "ui-monospace, monospace",
    fontSize: "0.75rem",
    color: "#64748b",
    marginBottom: "0.75rem",
  },
  familyAmount: {
    fontSize: "1.3rem",
    fontWeight: 700,
    marginBottom: "0.5rem",
  },
  amountUnit: {
    fontSize: "0.8rem",
    fontWeight: 400,
    opacity: 0.7,
  },
  explorerLink: {
    display: "inline-block",
    fontSize: "0.8rem",
    color: "#818cf8",
    textDecoration: "none",
    marginTop: "0.3rem",
  },
  errorText: {
    fontSize: "0.75rem",
    color: "#ef4444",
    marginTop: "0.4rem",
  },
  logSection: {
    marginTop: "2.5rem",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "0.75rem 1rem",
  },
  logSummary: {
    cursor: "pointer",
    color: "#94a3b8",
    fontSize: "0.9rem",
  },
  logPre: {
    fontFamily: "ui-monospace, monospace",
    fontSize: "0.8rem",
    color: "#cbd5e1",
    whiteSpace: "pre-wrap",
    margin: "0.75rem 0 0",
  },
}