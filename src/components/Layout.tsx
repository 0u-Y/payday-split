import { useEffect, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { Wallet } from "lucide-react"
import { useSender } from "../contexts/SenderContext"
import { useWalletConnect } from "../contexts/WalletConnectContext"
import { getClient } from "../xrpl/client"
import { getRLUSDBalance } from "../xrpl/query"
import { issueToken } from "../xrpl/issue"
import { walletFromSeed } from "../xrpl/wallet"
import { shortAddr } from "../lib/format"
import { Badge, Mono } from "./ui"
import { WalletConnectModal } from "./WalletConnectModal"
import { ISSUER_SEED } from "../config"

const NAV_ITEMS = [
  { path: "/", label: "Home", end: true },
  { path: "/send", label: "송금", end: false },
  { path: "/dashboard", label: "대시보드", end: false },
]

const MIN_BALANCE = 1

function Logo() {
  return (
    <Link to="/" className="no-underline text-ink">
      <span className="font-semibold text-[13px] tracking-tight">Payday Split</span>
    </Link>
  )
}

function WalletPill() {
  const { address, isReady, isCrossmark, isWalletConnected } = useSender()
  const { open } = useWalletConnect()
  const location = useLocation()
  const [balance, setBalance] = useState<number | null>(null)
  const [refilling, setRefilling] = useState(false)
  const [open2, setOpen2] = useState(false)

  const fetchBalance = async () => {
    if (!address) return
    const client = await getClient()
    try {
      const b = await getRLUSDBalance(client, address)
      setBalance(b)
    } catch (err) {
      console.error("잔고 조회 실패:", err)
    } finally {
      await client.disconnect()
    }
  }

  useEffect(() => {
    let cancelled = false
    if (!address) return
    ;(async () => {
      const client = await getClient()
      try {
        const b = await getRLUSDBalance(client, address)
        if (!cancelled) setBalance(b)
      } catch (err) {
        console.error("잔고 조회 실패:", err)
      } finally {
        await client.disconnect()
      }
    })()
    return () => { cancelled = true }
  }, [address, location.pathname])

  const handleRefill = async () => {
    if (!address || refilling) return
    setRefilling(true)
    const client = await getClient()
    try {
      const issuer = walletFromSeed(ISSUER_SEED)
      await issueToken(client, issuer, address, "10000")
      await fetchBalance()
    } catch (err) {
      console.error("충전 실패:", err)
    } finally {
      await client.disconnect()
      setRefilling(false)
    }
  }

  // preseeded 모드 미연결 — 지갑 연결 버튼
  if (!isCrossmark && !isWalletConnected) {
    return (
      <button
        type="button"
        onClick={() => open()}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-coral bg-coral text-white hover:bg-coral-dark hover:border-coral-dark transition cursor-pointer active:scale-[0.98]"
      >
        <Wallet size={14} />
        <span className="text-[12px] font-bold tracking-tight">지갑 연결</span>
      </button>
    )
  }

  if (!isReady || !address) {
    const label = isCrossmark ? "Crossmark 미연결" : "셋업 중…"
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-bg-raised">
        <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-dot" />
        <Mono size={11} className="text-ink-mute">
          {label}
        </Mono>
      </div>
    )
  }

  const isLow = balance !== null && balance < MIN_BALANCE

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen2((v) => !v)}
        className={`flex items-center gap-2 py-1.5 pl-1.5 pr-3 rounded-full border bg-bg-raised cursor-pointer ${
          isLow ? "border-red" : "border-line"
        }`}
      >
        <div className="w-[22px] h-[22px] rounded-full bg-ink text-white flex items-center justify-center text-[10px] font-bold">
          NV
        </div>
        <Mono size={11} className="text-ink-soft">
          {shortAddr(address)}
        </Mono>
        <span className="w-px h-3 bg-line" />
        {balance === null ? (
          <Mono size={11} className="text-ink-mute">…</Mono>
        ) : (
          <Mono size={11} className={isLow ? "text-red font-bold" : "text-ink-soft font-semibold"}>
            {balance.toFixed(2)}
            <span className="text-ink-mute font-medium ml-1">RLUSD</span>
          </Mono>
        )}
      </button>

      {open2 && (
        <div className="absolute right-0 top-[calc(100%+6px)] bg-bg-raised border border-line rounded-[10px] shadow-lift py-1 z-50 min-w-[140px]">
          <button
            type="button"
            onClick={() => { setOpen2(false); handleRefill() }}
            disabled={refilling}
            className="w-full px-4 py-2 text-left text-[12px] font-semibold text-ink hover:bg-bg-sunken disabled:opacity-50 transition"
          >
            {refilling ? "충전 중…" : "RLUSD 충전 +10,000"}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3.5 py-2 rounded-[6px] text-[13px] transition no-underline ${
      isActive
        ? "bg-bg-sunken text-ink font-semibold"
        : "text-ink-mute font-medium hover:text-ink hover:bg-bg-sunken"
    }`

  return (
    <div className="min-h-screen bg-bg font-kr text-ink">
      <header className="h-[60px] border-b border-line bg-bg-raised px-7 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-9">
          <Logo />
          <nav className="flex gap-1">
            {NAV_ITEMS.map((it) => (
              <NavLink key={it.path} to={it.path} end={it.end} className={navClass}>
                {it.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Badge kind="sage">
            <span className="w-1.5 h-1.5 rounded-full bg-sage inline-block animate-pulse-dot" />
            XRPL Testnet 연결됨
          </Badge>
          <WalletPill />
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <WalletConnectModal />
    </div>
  )
}
