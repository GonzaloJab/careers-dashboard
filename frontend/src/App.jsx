import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import BoardPage from "./pages/BoardPage";
import JobPage from "./pages/JobPage";
import RecruiterPage from "./pages/RecruiterPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BoardPage />} />
        <Route path="/jobs/:publicId" element={<JobPage />} />
        <Route path="/recruiter" element={<RecruiterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

