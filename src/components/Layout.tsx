import { Link, NavLink, Outlet } from "react-router-dom"

export default function Layout() {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-sm transition ${
      isActive
        ? "bg-slate-700 text-white"
        : "text-slate-400 hover:text-white hover:bg-slate-800"
    }`

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg">
            Payday Split
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/send" className={navClass}>
              송금
            </NavLink>
            <NavLink to="/dashboard" className={navClass}>
              대시보드
            </NavLink>
            <NavLink to="/demo" className={navClass}>
              데모
            </NavLink>
          </nav>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}