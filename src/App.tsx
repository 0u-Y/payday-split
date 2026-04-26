import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import { SenderProvider } from "./contexts/SenderContext"
import Landing from "./pages/Landing"
import Send from "./pages/Send"
import Execute from "./pages/Execute"
import Recipient from "./pages/Recipient"
import Dashboard from "./pages/Dashboard"
import Demo from "./pages/Demo"
import FamilyNew from "./pages/FamilyNew"

export default function App() {
  return (
    <BrowserRouter>
      <SenderProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/send" element={<Send />} />
            <Route path="/execute" element={<Execute />} />
            <Route path="/recipient/:addr" element={<Recipient />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/family/new" element={<FamilyNew />} />
          </Route>
        </Routes>
      </SenderProvider>
    </BrowserRouter>
  )
}