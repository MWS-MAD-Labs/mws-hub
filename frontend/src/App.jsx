import { Routes, Route, Navigate } from 'react-router-dom'
import SupportHubPage from './pages/hub/SupportHubPage.jsx'
import { Toaster } from '@/components/ui/toaster'

// Placeholder until fase 3 (Hub's own Google Workspace login) exists.
function ProfilePlaceholder() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Profile page - not built yet.
    </div>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/support-hub" replace />} />
        <Route path="/support-hub" element={<SupportHubPage />} />
        <Route path="/profile" element={<ProfilePlaceholder />} />
      </Routes>
      <Toaster />
    </>
  )
}
