# Payday Split
**One paycheck. Every family member. One settlement cycle on the XRP Ledger.**

Live demo: https://payday-split.vercel.app

---

## What It Solves
Korea hosts approximately 2.83 million foreign residents. Most send money home every month — but the current remittance structure has three simultaneous inefficiencies.
- Global average remittance cost is 6.36%, bank channels average 12% (World Bank 2025) — four times the UN SDG target of 3%
- Transfers are 1-to-1 only, so splitting money among multiple family members requires redistribution at the destination, adding another layer of cost and delay
- Exchange rate timing is left entirely to the sender — a disadvantage for users with limited Korean language ability or financial literacy

Payday Split targets all three at once. A worker sets their family split ratios once. On payday, one click sends the correct proportional amount to each family member simultaneously, on XRPL, settling in seconds at near-zero cost.

---

## Why XRPL
3–5 second finality. Fees under $0.001 per transaction. And most importantly: delegation, limits, and multi-party settlement are implemented using only protocol-native features — no smart contracts, no additional attack surface, no regulatory gray area.

---

## Demo Scenario
The demo simulates **Anh**, a Vietnamese worker in Korea, returning to the app as an existing user.

**Pre-seeded state (set up before demo, not shown in recording)**
- Sender wallet: pre-created, RLUSD trust line open, balance pre-loaded
- Three family wallets pre-created with RLUSD trust lines: mother (40%), father (30%), younger sister (15%)
- `localStorage` pre-populated with sender info and the three registered family members
- Fourth family member (younger brother, 15%) is intentionally absent — registered live during demo

**Step 0 — Landing (`/`)**
User arrives as a returning user. Clicks "송금 시작". Navigates to `/send`.

**Step 1 — Send page (`/send`)**
- Sender wallet info and RLUSD balance shown in header
- Default salary input: KRW 3,000,000
- AI rate signal card: "지금 송금하세요" with 7-day mini chart
- Three registered family members shown: mother 40%, father 30%, younger sister 15%
- Share total shows 85% — send button is disabled
- User clicks "+ 가족 추가 등록"

**Step 2 — Family registration (`/family/new`)**

*Step 2-1: Input*
User fills in name, relationship (dropdown), country (dropdown), and wallet address (paste pre-created address).

*Step 2-2: Verification animation*
Four sequential checks with step-by-step animation:

- **Step A — XRPL Trust Line check** (real): queries the ledger via `account_lines` to confirm the address has an RLUSD trust line open against the issuer. Blocks registration if missing.
- **Step B — Vietnam KYC** (mock): simulates VC issuance from "Vietnam National ID Authority". Credential stored off-chain.
- **Step C — XRPL DID registration** (mock): simulates a `DIDSet` transaction writing `did:xrpl:1:...` to the ledger with a URI referencing the VC.
- **Step D — Family relationship verification** (mock): simulates reading the DID, resolving the VC, and confirming "Anh의 남동생 검증됨".

*Step 2-3: Share assignment*
The four-member split card appears with the new member at 0%. User sets younger brother to 15%. Total reaches 100%. Registration completes. Returns to `/send`.

**Step 3 — Send page again (`/send`)**
All four family members shown with correct percentages. Share total 100%. Send button activates. User clicks "RLUSD 분할 송금".

**Step 4 — Execution (`/execute`)**
Three-step timeline, rendered sequentially with live status badges:

- **Step 4-1: Korea on-ramp** — visual card simulating KRW to RLUSD conversion via a partner like Toss Bank. Completes after a short delay.
- **Step 4-2: XRPL 1:N split payment** (real on-chain) — four Payment transactions submitted in parallel with pre-incremented sequence numbers. Each family row shows live status and, on success, a clickable XRPL Explorer link.
- **Step 4-3: Southeast Asia off-ramp** — visual card simulating RLUSD to VND settlement via local e-wallet partner. Completes after a short delay.

---

## Technical Architecture

### Transaction Flow
The core of the application is `splitPayment()` in `src/xrpl/payment.ts`. When the user confirms a send.
1. **Pre-flight validation** — share percentages must sum to exactly 100%. Sender balance must be at least `totalAmount * 1.005` (5% buffer for rounding). Every recipient must have an RLUSD trust line.
2. **Sequence acquisition** — a single `account_info` request retrieves the sender's current ledger sequence number.
3. **Parallel submission** — one `Payment` transaction is constructed per recipient, each assigned `baseSequence + i` so they can be submitted concurrently without nonce conflicts. Submitted via `Promise.allSettled`.
4. **Ledger confirmation** — each payment uses `client.submitAndWait()`, which blocks until the transaction appears in a validated ledger and returns a definitive `tesSUCCESS` or error code.
5. **Result collection** — results are stored as a `TransactionRecord` in `localStorage` with per-payment `txHash`, amounts, and status.

RLUSD payments use the IOU token format.
```ts
Amount: {
  currency: RLUSD_CURRENCY,  // hex-encoded "RLUSD"
  issuer: RLUSD_ISSUER,
  value: amount,
}
```

**Atomicity note**: parallel execution means partial success is possible — some payments may succeed while others fail. The app surfaces this as `status: "partial"` and shows per-family results. True atomicity (all-or-nothing) is a Phase 2 target, likely via Escrow with a two-phase release.

### Trust Line as On-chain Family Registry

When a family member is registered, the app verifies (and in the full flow, creates) an RLUSD trust line for their address. This serves two purposes.
1. The trust line is a prerequisite for receiving any RLUSD IOU on XRPL — no trust line means no payment can land.
2. It acts as a minimal on-chain record of "this address is approved to receive from this sender", without requiring a separate database.

Trust line presence is checked via `account_lines` in `src/xrpl/query.ts` before every payment batch. Any address missing a trust line causes the entire batch to be blocked with a clear error.

### Sender Wallet Setup
`ensureSender()` in `src/services/sender.ts` handles wallet initialization.
- Checks `localStorage` for a stored sender wallet
- If absent, calls `client.fundWallet()` (XRPL Testnet faucet), creates a new keypair, opens an RLUSD trust line via `TrustSet`, and persists the seed
- If `USE_LOCAL_ISSUER = true` and the sender's RLUSD balance is below 10, automatically requests a 100 RLUSD top-up from the issuer wallet

For demo recording, the sender wallet is pre-created and baked into `localStorage` so the setup wait never appears on screen.

### RLUSD Supply
The app uses a self-managed test issuer rather than real Ripple RLUSD (which requires manual acquisition from tryrlusd.com). The issuer wallet is pre-configured on testnet. When a sender wallet is created, the issuer sends 5,000 RLUSD via a `Payment` transaction. For the actual demo recording, real RLUSD will be pre-loaded.

### AI Rate Signal
`getAISignal()` in `src/lib/aiSignal.ts` computes a sigma score over a 7-day KRW/USD rate history.
```
mean   = average of 7 daily rates
stdDev = population standard deviation
sigma  = (mean - latest) / stdDev
```

A positive sigma means the current rate is below the weekly average — fewer KRW needed to buy the same RLUSD — a favorable time to send. Signal levels.
| sigma | level | displayed message |
|---|---|---|
| >= 1.0 | strong | 지금 송금하세요 |
| >= 0.3 | good | 좋은 시점입니다 |
| -0.3 to 0.3 | neutral | 평소 수준입니다 |
| <= -0.3 | wait | 조금 기다려보세요 |
| <= -1.0 | warning | 대기 권장 |

The current implementation uses mock historical data. Real-time exchange rate API integration is planned.

### DID / KYC (Mock)
The registration flow visualizes four verification steps. Only Step A (trust line check) is real. Steps B–D simulate.
- **KYC**: VC issuance from a national ID authority, stored off-chain
- **DID**: `DIDSet` transaction writing a `did:xrpl:1:...` identifier to the ledger per [XLS-40](https://xls.xrpl.org/xls/XLS-0040-decentralized-identity.html), with a URI referencing the VC
- **Relationship verification**: resolving the DID and reading family relationship data from the VC

These are implemented as timed animations with realistic labels. The infrastructure for real DID integration is the XLS-40 standard on XRPL.

### Data Persistence
No backend. All state lives in `localStorage` via `src/services/storage.ts`.
| Key | Contents |
|---|---|
| `payday-split:sender` | Sender wallet address, seed, created timestamp |
| `payday-split:families` | Array of `Family` records with address, seed (demo), share percent, KYC metadata |
| `payday-split:transactions` | Full `TransactionRecord` history with per-payment txHash, amounts, status |
| `payday-split:wallet-connected` | Boolean flag for pre-seeded connection mode |

Limitations: no cross-device access, data is lost on cache clear. Production would replace this with a backend database.

---

## Implemented vs Mocked
| Feature | Status |
|---|---|
| XRPL Testnet 1:N split payment | Real — on-chain Payment transactions |
| Trust line verification | Real — live `account_lines` query |
| Trust line creation (family registration) | Real — `TrustSet` transaction |
| XRPL Explorer links per payment | Real — links to `testnet.xrpl.org` |
| Korea on-ramp (KRW to RLUSD) | Mock — assumes Toss Bank or equivalent partner |
| Southeast Asia off-ramp (RLUSD to VND/PHP/THB) | Mock — assumes local e-wallet partner |
| KYC / Verifiable Credential issuance | Mock — animated simulation |
| DID registration (XLS-40) | Mock — animated simulation |
| Family relationship verification | Mock — animated simulation |
| AI rate signal | Partial — sigma algorithm implemented, rate data is mock |
| Exchange rate | Mock — hardcoded at 1 USD = KRW 1,458 |

---

## Roadmap
| Phase | Scope |
|---|---|
| Phase 1 (current) | Korea to Vietnam / Philippines / Thailand corridor, 1:N split payment MVP |
| Phase 2 | Automated delegation — configure once, auto-send monthly at optimal timing |
| Phase 3 | In-Korea payment and savings integration, asset building for migrant workers |
| Phase 4 | Expansion to Japan, Taiwan, Middle East remittance corridors |

---

## Project Structure
```
src/
├── components/
│   ├── Layout.tsx                   # App shell and navigation
│   ├── WalletConnectModal.tsx       # Pre-seeded wallet selection modal
│   └── ui/                          # Design system primitives
├── contexts/
│   ├── SenderContext.tsx            # Sender wallet state (Crossmark + pre-seeded modes)
│   └── WalletConnectContext.tsx     # Modal visibility context
├── data/
│   └── preseeded.ts                 # Pre-created demo wallets and family presets
├── lib/
│   ├── aiSignal.ts                  # Sigma-based exchange rate signal
│   ├── dashboard.ts                 # KPI aggregation, monthly trend, family distribution
│   ├── devtools.ts                  # Dev console helpers
│   ├── family.ts                    # Family color and label presets
│   └── format.ts                    # KRW and address formatters
├── pages/
│   ├── Landing.tsx                  # Hero page and how-it-works
│   ├── Send.tsx                     # Salary input, family split config, AI signal card
│   ├── Execute.tsx                  # 3-step execution timeline with live tx status
│   ├── Dashboard.tsx                # Analytics, KPI cards, transaction history
│   ├── FamilyNew.tsx                # Family registration with verification flow
│   └── Recipient.tsx                # Recipient detail view
├── scripts/
│   ├── demo.ts                      # Seed demo transaction history into localStorage
│   └── setup-issuer.ts              # Bootstrap issuer trust lines on testnet
├── services/
│   ├── sender.ts                    # Wallet bootstrap, RLUSD auto-refill logic
│   └── storage.ts                   # localStorage CRUD layer
├── xrpl/
│   ├── client.ts                    # XRPL WebSocket client singleton
│   ├── issue.ts                     # IOU issuance (issuer to recipient)
│   ├── payment.ts                   # splitPayment() and sendRLUSD()
│   ├── query.ts                     # Balance and trust line queries
│   ├── trustline.ts                 # TrustSet transaction helper
│   └── wallet.ts                    # Wallet creation and seed derivation
├── config.ts                        # Network URL, issuer address, exchange rate constants
├── types.ts                         # Shared TypeScript types
└── App.tsx                          # Router setup
```

---

## Getting Started
### Prerequisites
- Node.js 18 or later
- npm 9 or later

### Install
```bash
git clone https://github.com/your-org/payday-split.git
cd payday-split
npm install
```

### Environment Variables
```env
VITE_ISSUER_SEED=your_testnet_issuer_seed
```

Required only when `USE_LOCAL_ISSUER = true` in `src/config.ts`. The issuer wallet must already be activated and have RLUSD issuance authority on testnet.

### Run
```bash
npm run dev       # http://localhost:5173
npm run build     # production build to dist/
npm run preview   # preview production build locally
```

### Seed Demo Data
```bash
npx tsx src/scripts/demo.ts          # populate localStorage with sample transaction history
npx tsx src/scripts/setup-issuer.ts  # configure issuer trust lines on testnet
```

---

## Configuration
All constants are in `src/config.ts`.

| Constant | Default | Description |
|---|---|---|
| `TESTNET_URL` | `wss://s.altnet.rippletest.net:51233` | XRPL Testnet WebSocket endpoint |
| `RLUSD_ISSUER` | testnet address | RLUSD issuer account |
| `RLUSD_CURRENCY` | hex-encoded string | RLUSD currency identifier |
| `TRUST_LINE_LIMIT` | `1000000` | Trust line limit per recipient |
| `EXCHANGE_RATE_KRW_USD` | `1458` | KRW per USD for conversion display |
| `USE_LOCAL_ISSUER` | `true` | `true` = self-managed testnet issuer, `false` = real RLUSD |
| `EXPLORER_BASE` | `https://testnet.xrpl.org` | Block explorer base URL for transaction links |

---

## Tech Stack
| | |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| Build | Vite 8, tsx |
| Routing | React Router DOM v7 |
| Blockchain | xrpl.js v4, Crossmark SDK |
| Linting | ESLint 10, typescript-eslint |

---

## Track
Ripple — Global Payments & FX
`#XRPL` `#Payment` `#Fintech` `#Stablecoin` `#Remittance`

---

## License
MIT
