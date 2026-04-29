import { useEffect, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { useSender } from "../contexts/SenderContext"
import { getClient } from "../xrpl/client"
import { getRLUSDBalance } from "../xrpl/query"
import { shortAddr } from "../lib/format"
import { Badge, Mono } from "./ui"

const NAV_ITEMS = [
  { path: "/", label: "Home", end: true },
  { path: "/send", label: "송금", end: false },
  { path: "/dashboard", label: "대시보드", end: false },
]

const MIN_BALANCE = 1

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 no-underline text-ink">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="10" stroke="var(--color-ink)" strokeWidth="1.5" />
        <path d="M11 1 V21" stroke="var(--color-ink)" strokeWidth="1.5" />
        <path d="M11 11 L19 7" stroke="var(--color-coral)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11 11 L19 15" stroke="var(--color-coral)" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11 11 L3 11" stroke="var(--color-coral)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="font-bold text-base tracking-tight font-kr">Payday Split</span>
    </Link>
  )
}

function WalletPill() {
  const { address, isReady } = useSender()
  const location = useLocation()
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    if (!address) return
    let cancelled = false
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
    return () => {
      cancelled = true
    }
  }, [address, location.pathname])

  if (!isReady || !address) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-line bg-bg-raised">
        <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse-dot" />
        <Mono size={11} className="text-ink-mute">
          셋업 중…
        </Mono>
      </div>
    )
  }

  const isLow = balance !== null && balance < MIN_BALANCE

  return (
    <div
      className={`flex items-center gap-2 py-1.5 pl-1.5 pr-3 rounded-full border bg-bg-raised ${
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
        <Mono size={11} className="text-ink-mute">
          …
        </Mono>
      ) : (
        <Mono size={11} className={isLow ? "text-red font-bold" : "text-ink-soft font-semibold"}>
          {balance.toFixed(2)}
          <span className="text-ink-mute font-medium ml-1">RLUSD</span>
        </Mono>
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
    </div>
  )
}
