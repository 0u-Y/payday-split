import { Avatar, Badge, Card, Mono } from "../components/ui"
import { FAMILY_PRESET } from "../lib/family"

const FAMILY = FAMILY_PRESET

const RECENT = [
  { d: "2026-04-27", t: "14:32", krw: "3,000,000", rlusd: "2,209.13", hash: "A8F2D9" },
  { d: "2026-03-27", t: "14:08", krw: "2,950,000", rlusd: "2,177.40", hash: "7B3E8A" },
  { d: "2026-02-26", t: "15:22", krw: "3,050,000", rlusd: "2,234.86", hash: "C5D1E9" },
  { d: "2026-01-25", t: "13:45", krw: "2,900,000", rlusd: "2,128.57", hash: "F2A6B4" },
]

const PERIODS = ["1M", "6M", "1Y", "전체"]
const ACTIVE_PERIOD = "1Y"

export default function Dashboard() {
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
          <div className="text-[13px] text-ink-soft">지난 12개월 · 베트남 가족 4명</div>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => {
            const active = p === ACTIVE_PERIOD
            return (
              <button
                key={p}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold cursor-pointer transition ${
                  active
                    ? "bg-ink text-white border-ink"
                    : "bg-transparent text-ink-soft border-line hover:bg-bg-sunken"
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
            vs SWIFT · 1년 누적 절감
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[48px] font-extrabold tracking-[-0.03em] tabular-nums">
              ₩1,412,800
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
            ₩36.2M
          </Mono>
          <div className="text-xs text-sage font-semibold mt-1">↑ 12회 · 4명 × 12개월</div>
          <SparkBar />
        </Card>

        {/* 평균 정산 시간 */}
        <Card padded={false} className="p-6">
          <div className="text-[11px] text-ink-mute font-bold tracking-[0.08em] mb-2">
            평균 정산 시간
          </div>
          <div className="flex items-baseline gap-1.5">
            <Mono size={32} className="font-extrabold tracking-[-0.02em]">
              3.4
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
              3.4s
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
              {FAMILY.map((f) => (
                <div key={f.id} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-[2px]" style={{ background: f.color }} />
                  <span className="text-[11px] text-ink-soft font-semibold">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
          <StackedChart />
        </Card>

        <Card padded={false} className="p-[22px]">
          <div className="text-sm font-bold mb-1">가족별 분배</div>
          <div className="text-xs text-ink-mute mb-4">이번 달 비율</div>
          <div className="flex items-center gap-[18px]">
            <DonutChart />
            <div className="flex-1">
              {FAMILY.map((f) => {
                const krw = Math.round((3_000_000 * f.share) / 100 / 1000)
                return (
                  <div key={f.id} className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2.5 h-2.5 rounded-[2px]"
                      style={{ background: f.color }}
                    />
                    <div className="flex-1 text-xs font-semibold">{f.label}</div>
                    <Mono size={12} className="font-bold">
                      {f.share}%
                    </Mono>
                    <Mono size={10} className="text-ink-mute w-[50px] text-right">
                      ₩{krw}K
                    </Mono>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent timeline */}
      <Card padded={false}>
        <div className="px-[22px] py-3.5 border-b border-line-soft flex justify-between">
          <div className="text-sm font-bold">최근 송금 내역</div>
          <a className="text-xs text-coral font-semibold cursor-pointer">전체 보기 →</a>
        </div>
        {RECENT.map((r, i) => (
          <div
            key={i}
            className={`grid items-center px-[22px] py-3 gap-2.5 ${
              i < RECENT.length - 1 ? "border-b border-line-soft" : ""
            }`}
            style={{ gridTemplateColumns: "120px 1fr 140px 140px 100px 80px" }}
          >
            <div>
              <Mono size={12} className="font-semibold">
                {r.d}
              </Mono>
              <Mono size={10} className="text-ink-mute block">
                {r.t}
              </Mono>
            </div>
            <div className="flex items-center gap-1">
              {FAMILY.map((f) => (
                <Avatar key={f.id} name={f.label} size={22} color={f.color} />
              ))}
              <span className="text-xs text-ink-mute ml-1.5">4명에게 분할</span>
            </div>
            <Mono size={13} className="font-bold text-right">
              ₩{r.krw}
            </Mono>
            <Mono size={12} className="text-right text-ink-mute">
              {r.rlusd} RLUSD
            </Mono>
            <Badge kind="sage">완료</Badge>
            <Mono size={10} className="text-ink-mute text-right">
              {r.hash} ↗
            </Mono>
          </div>
        ))}
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

function SparkBar() {
  const data = [40, 52, 48, 60, 55, 70, 65, 78, 82, 75, 88, 100]
  return (
    <div className="flex items-end gap-[3px] h-9 mt-3.5">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-[1px] ${
            i === data.length - 1 ? "bg-coral" : "bg-line"
          }`}
          style={{ height: `${v}%` }}
        />
      ))}
    </div>
  )
}

function StackedChart() {
  const months = [
    "5월", "6월", "7월", "8월", "9월", "10월",
    "11월", "12월", "1월", "2월", "3월", "4월",
  ]
  const heights = [60, 65, 62, 68, 70, 67, 72, 75, 73, 78, 80, 88]
  return (
    <div>
      <div className="flex items-end gap-1.5 h-40">
        {months.map((m, i) => {
          const total = heights[i]
          const isLast = i === heights.length - 1
          return (
            <div key={m} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full flex flex-col rounded-[4px] overflow-hidden"
                style={{ height: total * 1.5 }}
              >
                {FAMILY.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      height: `${f.share}%`,
                      background: f.color,
                      opacity: isLast ? 1 : 0.85,
                    }}
                  />
                ))}
              </div>
              <div
                className={`text-[10px] ${
                  isLast ? "text-ink font-bold" : "text-ink-mute font-medium"
                }`}
              >
                {m}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DonutChart() {
  let cum = 0
  const r = 50
  const cx = 60
  const cy = 60
  return (
    <svg width="120" height="120" viewBox="0 0 120 120">
      {FAMILY.map((f) => {
        const frac = f.share / 100
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
            key={f.id}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
            fill={f.color}
          />
        )
      })}
      <circle cx={cx} cy={cy} r={28} fill="var(--color-bg-raised)" />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize="10"
        fill="var(--color-ink-mute)"
        fontWeight="600"
      >
        총
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
        2,209
      </text>
    </svg>
  )
}
