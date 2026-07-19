import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ProductsPage from "./modules/products/pages/ProductsPage";
import DecisionsPage from "./modules/decisions/pages/DecisionsPage";
import KnowledgePage from "./modules/knowledge/pages/KnowledgePage";
import PrioritizationPage from "./modules/prioritization/pages/PrioritizationPage";
import RisksPage from "./modules/risks/pages/RisksPage";
import RoadmapPage from "./modules/roadmap/pages/RoadmapPage";
import StakeholdersPage from "./modules/stakeholders/pages/StakeholdersPage";
import VPCPage from "./modules/vpc/pages/VPCPage";
import BacklogPage from "./modules/backlog/pages/BacklogPage";

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#060a14",
        fontFamily: "'Orbitron', monospace", color: "#00d4ff",
        fontSize: "12px", letterSpacing: "4px"
      }}>
        <span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>
          INICIALIZANDO SISTEMA...
        </span>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

function P({ component: Component }: { component: React.ComponentType }) {
  return <ProtectedRoute><Component /></ProtectedRoute>;
}

// ─── App Router ───────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<P component={HomePage} />} />
      <Route path="/modules/products" element={<P component={ProductsPage} />} />
      <Route path="/modules/decisions" element={<P component={DecisionsPage} />} />
      <Route path="/modules/knowledge" element={<P component={KnowledgePage} />} />
      <Route path="/modules/prioritization" element={<P component={PrioritizationPage} />} />
      <Route path="/modules/risks" element={<P component={RisksPage} />} />
      <Route path="/modules/roadmap" element={<P component={RoadmapPage} />} />
      <Route path="/modules/stakeholders" element={<P component={StakeholdersPage} />} />
      <Route path="/modules/vpc" element={<P component={VPCPage} />} />
      <Route path="/modules/backlog" element={<P component={BacklogPage} />} />
      {/* Catch-all → login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
