import { useParams } from "react-router-dom"

export default function Recipient() {
  const { addr } = useParams<{ addr: string }>()

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-2">수취인 페이지</h1>
      <p className="text-slate-400 mb-2">주소: <code className="text-sm">{addr}</code></p>
      <p className="text-slate-500">준비 중...</p>
    </div>
  )
}