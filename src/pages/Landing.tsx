import { Link } from "react-router-dom"

export default function Landing() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-4">Payday Split</h1>
      <p className="text-slate-400 text-lg mb-8">
        재한 외국인 근로자의 월급을 본국 가족에게 한 번에 분할 송금
      </p>
      <p className="text-slate-300 mb-2">
        XRPL 기반 1:N 분할 송금 + AI 환율 타이밍 추천
      </p>
      <p className="text-slate-500 text-sm mb-8">
        한 번의 송금으로 어머니, 동생, 자녀에게 자동 분할. 수수료 4~8% → 0.0001%.
      </p>

      <div className="flex gap-3">
        <Link
          to="/send"
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-md font-medium transition"
        >
          송금 시작 →
        </Link>
        <Link
          to="/demo"
          className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-md font-medium transition"
        >
          XRPL 기술 데모
        </Link>
      </div>
    </div>
  )
}