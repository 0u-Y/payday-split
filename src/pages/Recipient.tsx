import { useParams } from "react-router-dom"
import { Avatar, Badge, Button, Card, FlagChip, Mono } from "../components/ui"
import { FAMILY_PRESET } from "../lib/family"
import { getFamilies } from "../services/storage"
import { shortAddr } from "../lib/format"

const HISTORY = [
  { d: "2026-04-27", a: "883.65", krw: "1,200K", new: true },
  { d: "2026-03-27", a: "863.94", krw: "1,180K" },
  { d: "2026-02-26", a: "892.41", krw: "1,200K" },
  { d: "2026-01-25", a: "850.10", krw: "1,150K" },
  { d: "2025-12-26", a: "904.78", krw: "1,210K" },
]

const LATEST = {
  amount: "883.65",
  share: 40,
  hash: "A8F2…D9C1",
  ledger: "4_829_113",
  confirmedAt: "2026-04-27 14:32",
  totalKRW: "3,000,000",
}

const BALANCE = {
  rlusd: "883.65",
  vnd: "22,348,000",
  krw: "1,200,000",
}

export default function Recipient() {
  const { addr } = useParams<{ addr: string }>()
  const families = getFamilies()
  const matched = families.find((f) => f.walletAddress === addr)

  const preset =
    (matched && FAMILY_PRESET.find((p) => p.label === matched.label)) ||
    FAMILY_PRESET[0]

  const family = {
    label: matched?.label ?? preset.label,
    role: preset.role,
    country: matched?.country ?? preset.country,
    color: preset.color,
    share: matched?.sharePercent ?? preset.share,
    addr: matched?.walletAddress ?? addr ?? "",
  }

  return (
    <div className="px-14 py-8 max-w-[920px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6">
        <Avatar name={family.label} size={52} color={family.color} />
        <div>
          <div className="text-xs text-ink-mute">수취인 페이지 · Mẹ Nguyễn</div>
          <div className="text-[22px] font-bold tracking-[-0.02em]">
            {family.label}의 지갑
          </div>
          <div className="text-xs text-ink-mute flex items-center gap-1.5 mt-0.5">
            <FlagChip code={family.country} size={14} />
            <Mono size={11}>{shortAddr(family.addr)}</Mono>
            <span>·</span>
            <span>호치민, 베트남</span>
          </div>
        </div>
      </div>

      {/* Balance hero */}
      <div className="bg-ink text-white p-7 rounded-[20px] mb-4 relative overflow-hidden">
        <div
          className="absolute rounded-full"
          style={{
            right: -40,
            top: -40,
            width: 220,
            height: 220,
            background: "rgba(232, 106, 77, 0.14)",
          }}
        />
        <div className="text-[11px] text-ink-faint font-bold tracking-[0.08em] mb-1.5">
          현재 잔고
        </div>
        <div className="flex items-baseline gap-2.5 mb-1">
          <Mono size={48} className="font-extrabold tracking-[-0.03em]">
            {BALANCE.rlusd}
          </Mono>
          <span className="text-lg text-ink-faint font-semibold">RLUSD</span>
        </div>
        <div className="text-sm text-ink-faint tabular-nums">
          ≈ {BALANCE.vnd} VND · ₩{BALANCE.krw}
        </div>
        <div className="flex gap-2 mt-[18px]">
          <Button kind="coral" size="sm">
            현지 통화로 인출 →
          </Button>
          <Button
            kind="ghost"
            size="sm"
            className="!text-white !border !border-white/20"
          >
            QR 코드
          </Button>
        </div>
      </div>

      {/* Latest receipt + history */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Latest */}
        <Card padded={false}>
          <div className="px-[18px] py-3.5 border-b border-line-soft flex justify-between items-center">
            <div>
              <div className="text-[11px] text-ink-mute font-bold tracking-[0.06em]">
                방금 도착
              </div>
              <div className="text-sm font-bold">아들 Nguyễn V. 송금</div>
            </div>
            <Badge kind="sage">+ 입금</Badge>
          </div>
          <div className="p-[18px]">
            <div className="flex items-baseline gap-1.5 mb-3">
              <span className="text-sm text-sage font-bold">+</span>
              <Mono size={28} className="font-extrabold">
                {LATEST.amount}
              </Mono>
              <span className="text-[13px] text-ink-mute">
                RLUSD · {LATEST.share}%
              </span>
            </div>
            <div className="text-xs text-ink-soft mb-2.5">
              {LATEST.totalKRW}원 월급 중 {family.label} 몫
            </div>
            <div className="flex flex-col gap-1.5 px-3 py-2.5 bg-bg rounded-[10px]">
              <KV label="Tx Hash" value={<Mono size={11}>{LATEST.hash}</Mono>} />
              <KV label="Ledger" value={<Mono size={11}>{LATEST.ledger}</Mono>} />
              <KV label="확정" value={LATEST.confirmedAt} />
            </div>
          </div>
        </Card>

        {/* History */}
        <Card padded={false}>
          <div className="px-[18px] py-3.5 border-b border-line-soft">
            <div className="text-[11px] text-ink-mute font-bold tracking-[0.06em]">
              수취 내역
            </div>
            <div className="text-sm font-bold">최근 6개월</div>
          </div>
          <div>
            {HISTORY.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-[18px] py-2.5 ${
                  i < HISTORY.length - 1 ? "border-b border-line-soft" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${
                      r.new ? "bg-coral" : "bg-line"
                    }`}
                  />
                  <Mono size={11} className="text-ink-soft">
                    {r.d}
                  </Mono>
                </div>
                <div className="text-right">
                  <Mono size={13} className="font-bold">
                    +{r.a}
                  </Mono>
                  <div className="text-[10px] text-ink-mute">≈ ₩{r.krw}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-[11px]">
      <span className="text-ink-mute">{label}</span>
      <span className="text-ink font-semibold">{value}</span>
    </div>
  )
}
