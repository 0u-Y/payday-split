import { useEffect, useState } from "react"
import { Avatar, Badge, Card, Mono } from "../components/ui"
import { fmtKRW } from "../lib/format"
import {
  colorForLabel,
  getDashboardKPI,
  getFamilyDistribution,
  getMonthlyTrend,
  getRecentTxs,
  type DashboardKPI,
  type FamilyDistEntry,
  type MonthlyEntry,
} from "../lib/dashboard"
import { getFamilies } from "../services/storage"
import type { TransactionRecord } from "../types"

const PERIODS = ["1M", "6M", "1Y", "전체"]
const ACTIVE_PERIOD = "1Y"
const EXPLORER_BASE = "https://testnet.xrpl.org/transactions"

const TX_STATUS_LABEL: Record<TransactionRecord["status"], string> = {
  pending: "대기",
  completed: "완료",
  partial: "부분 성공",
  failed: "실패",
}

type DashboardData = {
  kpi: DashboardKPI
  monthly: MonthlyEntry[]
  distribution: FamilyDistEntry[]
  recent: TransactionRecord[]
  familyCount: number
}

function loadDashboard(): DashboardData {
  return {
    kpi: getDashboardKPI(),
    monthly: getMonthlyTrend(),
    distribution: getFamilyDistribution(),
    recent: getRecentTxs(5),
    familyCount: getFamilies().length,
  }
}

function fmtKRWCompact(n: number): string {
  if (n === 0) return "₩0"
  if (n >= 1_000_000) return `₩${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`
  if (n >= 1_000) return `₩${Math.round(n / 1000)}K`
  return `₩${Math.round(n).toLocaleString("ko-KR")}`
}

function fmtTime(ts: number): { date: string; time: string } {
  const d = new Date(ts)
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  return { date, time }
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>(() => loadDashboard())

  useEffect(() => {
    setData(loadDashboard())
  }, [])

  const { kpi, monthly, distribution, recent, familyCount } = data
  const isEmpty = kpi.txCount === 0

  return (
    <div className="px-14 py-8">
      {/* Header */}
      <div className="flex justify-between items-end mb-[22px]">
        <div>
          <Mono size={11} className="text-ink-mute tracking-[0.08em]">
            OVERVIEW
          </Mono>
          <h2 className="text-[26px] font-bold mt-1 mb-1 tracking-[-0.02em]">
            내 송금 대시보드
          </h2>
          <div className="text-[13px] text-ink-soft">
            지난 12개월
            {familyCount > 0 && ` · 베트남 가족 ${familyCount}명`}
          </div>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => {
            const active = p === ACTIVE_PERIOD
            return (
              <button
                key={p}
                type="button"
                disabled
                aria-pressed={active}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition cursor-default ${
                  active
                    ? "bg-ink text-white border-ink"
                    : "bg-transparent text-ink-soft border-line"
                }`}
              >
                {p}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-[1.4fr_1fr_1fr] gap-3.5 mb-3.5">
        {/* vs SWIFT */}
        <Card padded={false} className="p-6 bg-coral text-white border-0 relative overflow-hidden">
          <div className="text-[11px] font-bold tracking-[0.08em] mb-2 opacity-85">
            vs SWIFT · 누적 절감
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[48px] font-extrabold tracking-[-0.03em] tabular-nums">
              {fmtKRW(kpi.vsSwiftSavings)}
            </span>
          </div>
          <div className="mt-1.5 text-[13px] opacity-90">
            일반 은행 SWIFT 송금 대비 <strong>98.3% 절약</strong>
          </div>
          <div className="mt-3.5 p-3 bg-white/15 rounded-[10px] flex justify-between">
            <SmallStat label="은행 평균" v="₩117,600" sub="/월" white />
            <SmallStat label="송금 앱" v="₩42,000" sub="/월" white />
            <SmallStat label="Payday Split" v="₩2,400" sub="/월" white bold />
          </div>
        </Card>

        {/* 누적 송금 */}
        <Card padded={false} className="p-6">
          <div className="text-[11px] text-ink-mute font-bold tracking-[0.08em] mb-2">
            누적 송금
          </div>
          <Mono size={32} className="font-extrabold tracking-[-0.02em]">
            {fmtKRWCompact(kpi.totalSentKRW)}
          </Mono>
          <div className="text-xs text-sage font-semibold mt-1">
            {isEmpty
              ? "송금 내역 없음"
              : `↑ ${kpi.txCount}회 · 가족 ${familyCount}명`}
          </div>
          <SparkBar monthly={monthly} />
        </Card>

        {/* 평균 정산 시간 */}
        <Card padded={false} className="p-6">
          <div className="text-[11px] text-ink-mute font-bold tracking-[0.08em] mb-2">
            평균 정산 시간
          </div>
          <div className="flex items-baseline gap-1.5">
            <Mono size={32} className="font-extrabold tracking-[-0.02em]">
              {kpi.avgSettleTime.toFixed(1)}
            </Mono>
            <span className="text-base text-ink-mute font-semibold">초</span>
          </div>
          <div className="text-xs text-ink-mute mt-1">
            SWIFT는 평균 1~3<strong className="text-ink">일</strong>
          </div>
          <div className="mt-3.5 h-1.5 bg-bg-sunken rounded-full relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full bg-sage" style={{ width: "1%" }} />
            <div
              className="absolute left-0 top-0 h-full w-full"
              style={{
                background:
                  "repeating-linear-gradient(90deg, transparent 0 4px, var(--color-line) 4px 5px)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <Mono size={9} className="text-sage font-bold">
              {kpi.avgSettleTime.toFixed(1)}s
            </Mono>
            <Mono size={9} className="text-ink-mute">
              ~24h+
            </Mono>
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-[1.6fr_1fr] gap-3.5 mb-3.5">
        <Card padded={false} className="p-[22px]">
          <div className="flex justify-between mb-3.5">
            <div>
              <div className="text-sm font-bold">월별 송금 추이</div>
              <div className="text-xs text-ink-mute">KRW · 가족별 누적</div>
            </div>
            <div className="flex gap-3">
              {distribution.map((f) => (
                <div key={f.familyId} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-[2px]" style={{ background: f.color }} />
                  <span className="text-[11px] text-ink-soft font-semibold">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
          {isEmpty ? (
            <EmptyChart label="송금 데이터가 없습니다" />
          ) : (
            <StackedChart monthly={monthly} />
          )}
        </Card>

        <Card padded={false} className="p-[22px]">
          <div className="text-sm font-bold mb-1">가족별 분배</div>
          <div className="text-xs text-ink-mute mb-4">전체 누적 비율</div>
          {isEmpty ? (
            <EmptyChart label="분배 내역이 없습니다" small />
          ) : (
            <div className="flex items-center gap-[18px]">
              <DonutChart segments={distribution} totalRLUSD={kpi.totalSentRLUSD} />
              <div className="flex-1">
                {distribution.map((s) => {
                  const pct =
                    kpi.totalSentRLUSD > 0
                      ? (s.totalReceivedRLUSD / kpi.totalSentRLUSD) * 100
                      : 0
                  return (
                    <div key={s.familyId} className="flex items-center gap-2 mb-2">
                      <div
                        className="w-2.5 h-2.5 rounded-[2px]"
                        style={{ background: s.color }}
                      />
                      <div className="flex-1 text-xs font-semibold">{s.label}</div>
                      <Mono size={12} className="font-bold">
                        {pct.toFixed(0)}%
                      </Mono>
                      <Mono size={10} className="text-ink-mute w-[60px] text-right">
                        {fmtKRWCompact(s.totalReceivedKRW)}
                      </Mono>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Recent timeline */}
      <Card padded={false}>
        <div className="px-[22px] py-3.5 border-b border-line-soft flex justify-between">
          <div className="text-sm font-bold">최근 송금 내역</div>
          <a className="text-xs text-coral font-semibold cursor-pointer">전체 보기 →</a>
        </div>
        {recent.length === 0 ? (
          <div className="px-[22px] py-12 text-center text-ink-mute text-sm">
            송금 내역 없음
          </div>
        ) : (
          recent.map((tx, i) => {
            const { date, time } = fmtTime(tx.createdAt)
            const firstHash = tx.payments[0]?.txHash
            const hashShort = firstHash ? firstHash.slice(0, 6).toUpperCase() : "—"
            const explorerUrl = firstHash ? `${EXPLORER_BASE}/${firstHash}` : null
            const status = TX_STATUS_LABEL[tx.status] ?? tx.status
            return (
              <div
                key={tx.id}
                className={`grid items-center px-[22px] py-3 gap-2.5 ${
                  i < recent.length - 1 ? "border-b border-line-soft" : ""
                }`}
                style={{ gridTemplateColumns: "120px 1fr 140px 140px 100px 80px" }}
              >
                <div>
                  <Mono size={12} className="font-semibold">
                    {date}
                  </Mono>
                  <Mono size={10} className="text-ink-mute block">
                    {time}
                  </Mono>
                </div>
                <div className="flex items-center gap-1">
                  {tx.payments.map((p) => (
                    <Avatar
                      key={p.familyId}
                      name={p.familyLabel}
                      size={22}
                      color={colorForLabel(p.familyLabel)}
                    />
                  ))}
                  <span className="text-xs text-ink-mute ml-1.5">
                    {tx.payments.length}명에게 분할
                  </span>
                </div>
                <Mono size={13} className="font-bold text-right">
                  {fmtKRW(tx.totalAmountKRW)}
                </Mono>
                <Mono size={12} className="text-right text-ink-mute">
                  {tx.totalAmountRLUSD.toFixed(2)} RLUSD
                </Mono>
                <Badge kind={tx.status === "completed" ? "sage" : "ink"}>{status}</Badge>
                {explorerUrl ? (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-right hover:text-coral transition"
                  >
                    <Mono size={10} className="text-ink-mute hover:text-coral">
                      {hashShort} ↗
                    </Mono>
                  </a>
                ) : (
                  <Mono size={10} className="text-ink-mute text-right">
                    {hashShort}
                  </Mono>
                )}
              </div>
            )
          })
        )}
      </Card>
    </div>
  )
}

function SmallStat({
  label,
  v,
  sub,
  white,
  bold,
}: {
  label: string
  v: string
  sub?: string
  white?: boolean
  bold?: boolean
}) {
  return (
    <div>
      <div
        className={`text-[9px] font-bold tracking-[0.06em] ${
          white ? "text-white opacity-75" : "text-ink-mute"
        }`}
      >
        {label}
      </div>
      <div
        className={`mt-0.5 font-mono tabular-nums ${
          bold ? "text-base font-extrabold" : "text-sm font-bold"
        } ${white ? "text-white" : "text-ink"}`}
      >
        {v}
        {sub && <span className="text-[9px] font-medium opacity-70 ml-0.5">{sub}</span>}
      </div>
    </div>
  )
}

function SparkBar({ monthly }: { monthly: MonthlyEntry[] }) {
  const max = Math.max(...monthly.map((m) => m.amount), 1)
  return (
    <div className="flex items-end gap-[3px] h-9 mt-3.5">
      {monthly.map((m, i) => {
        const h = (m.amount / max) * 100
        const isLast = i === monthly.length - 1
        return (
          <div
            key={m.month}
            className={`flex-1 rounded-[1px] ${isLast ? "bg-coral" : "bg-line"}`}
            style={{
              height: `${h}%`,
              minHeight: m.amount > 0 ? 2 : 0,
            }}
          />
        )
      })}
    </div>
  )
}

function StackedChart({ monthly }: { monthly: MonthlyEntry[] }) {
  const max = Math.max(...monthly.map((m) => m.amount), 1)
  const MAX_PX = 140

  return (
    <div className="flex items-end gap-1.5 h-44">
      {monthly.map((m, i) => {
        const heightPx = m.amount > 0 ? Math.max(2, (m.amount / max) * MAX_PX) : 0
        const monthLabel = `${parseInt(m.month.slice(5), 10)}월`
        const isLast = i === monthly.length - 1
        const families = Object.entries(m.byFamily)
        return (
          <div key={m.month} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            {heightPx > 0 ? (
              <div
                className="w-full flex flex-col rounded-[4px] overflow-hidden"
                style={{ height: heightPx }}
              >
                {families.map(([label, krw]) => {
                  const pct = (krw / m.amount) * 100
                  return (
                    <div
                      key={label}
                      style={{
                        height: `${pct}%`,
                        background: colorForLabel(label),
                        opacity: isLast ? 1 : 0.85,
                      }}
                    />
                  )
                })}
              </div>
            ) : null}
            <div
              className={`text-[10px] ${
                isLast ? "text-ink font-bold" : "text-ink-mute font-medium"
              }`}
            >
              {monthLabel}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({
  segments,
  totalRLUSD,
}: {
  segments: FamilyDistEntry[]
  totalRLUSD: number
}) {
  const sum = segments.reduce((s, e) => s + e.totalReceivedRLUSD, 0)
  const r = 50
  const cx = 60
  const cy = 60

  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {segments.length === 1 ? (
        <circle cx={cx} cy={cy} r={r} fill={segments[0].color} />
      ) : (
        (() => {
          let cum = 0
          return segments.map((s) => {
            const frac = sum > 0 ? s.totalReceivedRLUSD / sum : 0
            if (frac <= 0) return null
            const start = cum * 2 * Math.PI - Math.PI / 2
            cum += frac
            const end = cum * 2 * Math.PI - Math.PI / 2
            const x1 = cx + r * Math.cos(start)
            const y1 = cy + r * Math.sin(start)
            const x2 = cx + r * Math.cos(end)
            const y2 = cy + r * Math.sin(end)
            const large = frac > 0.5 ? 1 : 0
            return (
              <path
                key={s.familyId}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                fill={s.color}
              />
            )
          })
        })()
      )}
      <circle cx={cx} cy={cy} r={28} fill="var(--color-bg-raised)" />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize="9"
        fill="var(--color-ink-mute)"
        fontWeight="600"
      >
        총 RLUSD
      </text>
      <text
        x={cx}
        y={cy + 10}
        textAnchor="middle"
        fontSize="13"
        fill="var(--color-ink)"
        fontWeight="700"
        fontFamily="JetBrains Mono"
      >
        {Math.round(totalRLUSD).toLocaleString()}
      </text>
    </svg>
  )
}

function EmptyChart({ label, small }: { label: string; small?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center text-ink-mute text-xs ${
        small ? "h-[140px]" : "h-44"
      }`}
    >
      {label}
    </div>
  )
}
