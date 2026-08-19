import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import SupportHubPage from "@/pages/SupportHubPage";
import ProfilePage from "@/pages/ProfilePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/support-hub" replace />} />
        <Route path="/support-hub" element={<SupportHubPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
