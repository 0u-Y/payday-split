import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import Landing from "./pages/Landing"
import Send from "./pages/Send"
import Execute from "./pages/Execute"
import Recipient from "./pages/Recipient"
import Dashboard from "./pages/Dashboard"
import Demo from "./pages/Demo"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/send" element={<Send />} />
          <Route path="/execute" element={<Execute />} />
          <Route path="/recipient/:addr" element={<Recipient />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/demo" element={<Demo />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}