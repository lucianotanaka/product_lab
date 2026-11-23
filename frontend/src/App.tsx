import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CompanyProvider } from "./contexts/CompanyContext";
import { ProductProvider } from "./contexts/ProductContext";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ProductsPage from "./modules/products/pages/ProductsPage";
import DecisionsPage from "./modules/decisions/pages/DecisionsPage";
import KnowledgePage from "./modules/knowledge/pages/KnowledgePage";
import PrioritizationPage from "./modules/prioritization/pages/PrioritizationPage";
import RisksPage from "./modules/risks/pages/RisksPage";
import RoadmapPage from "./modules/roadmap/pages/RoadmapPage";
import RoadmapDetailPage from "./modules/roadmap/pages/RoadmapDetailPage";
import StakeholdersPage from "./modules/stakeholders/pages/StakeholdersPage";
import VPCPage from "./modules/vpc/pages/VPCPage";
import DiscoveryPage from "./modules/discovery/pages/DiscoveryPage";
import BacklogPage from "./modules/backlog/pages/BacklogPage";
import CommunicationPage from "./modules/communication/pages/CommunicationPage";
import UsersPage from "./modules/users/pages/UsersPage";
import RequirementsPage from "./modules/requirements/pages/RequirementsPage";
import ProcessMappingPage from "./modules/process_mapping/pages/ProcessMappingPage";
import CompaniesPage from "./modules/companies/pages/CompaniesPage";
import BusinessAreasPage from "./modules/business_areas/pages/BusinessAreasPage";
import IntegrationsPage from "./modules/integrations/pages/IntegrationsPage";
import AIAgentPage from "./modules/ai_agent/pages/AIAgentPage";
import MeetingsPage from "./modules/meetings/pages/MeetingsPage";
import RaciPage from "./modules/raci/pages/RaciPage";
import FollowUpsPage from "./modules/followups/pages/FollowUpsPage";
import BusinessDomainPage from "./modules/business_domains/pages/BusinessDomainPage";
import ExecutiveReportPage from "./modules/executive_report/pages/ExecutiveReportPage";

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

// ─── Admin-Only Route ─────────────────────────────────────────────────────────
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!isAdmin) return <Navigate to="/home" replace />;
  return <>{children}</>;
}

function A({ component: Component }: { component: React.ComponentType }) {
  return <AdminRoute><Component /></AdminRoute>;
}

// ─── Science Theme Mapping ────────────────────────────────────────────────────
const ROUTE_SCIENCE: Record<string, string> = {
  "/modules/discovery":      "astrophysics",
  "/modules/vpc":            "astrophysics",
  "/modules/process-mapping":"astrophysics",
  "/modules/requirements":   "quantum",
  "/modules/decisions":      "quantum",
  "/modules/knowledge":      "quantum",
  "/modules/business-domains":"quantum",
  "/modules/roadmap":        "plasma",
  "/modules/backlog":        "plasma",
  "/modules/prioritization": "plasma",
  "/modules/meetings":       "neural",
  "/modules/communication":  "neural",
  "/modules/ai-agent":       "neural",
  "/modules/stakeholders":   "molecular",
  "/modules/risks":          "neural",
  "/modules/raci":           "neural",
  "/modules/followups":      "neural",
  "/modules/products":       "molecular",
  "/settings/companies":     "molecular",
  "/settings/business-areas":"molecular",
  "/settings/integrations":  "molecular",
};

function ScienceThemeWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const path = "/" + location.pathname.split("/").slice(1, 3).join("/");
  const scienceId = ROUTE_SCIENCE[path] ?? ROUTE_SCIENCE[location.pathname] ?? "";
  return <div data-science={scienceId || undefined} style={{ minHeight: "100vh" }}>{children}</div>;
}

// ─── App Router ───────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <ScienceThemeWrapper>
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/home" element={<P component={HomePage} />} />
      <Route path="/modules/products" element={<P component={ProductsPage} />} />
      <Route path="/modules/decisions" element={<P component={DecisionsPage} />} />
      <Route path="/modules/knowledge" element={<P component={KnowledgePage} />} />
      <Route path="/modules/prioritization" element={<P component={PrioritizationPage} />} />
      <Route path="/modules/risks" element={<P component={RisksPage} />} />
      <Route path="/modules/roadmap" element={<P component={RoadmapPage} />} />
      <Route path="/modules/roadmap/:id" element={<P component={RoadmapDetailPage} />} />
      <Route path="/modules/stakeholders" element={<P component={StakeholdersPage} />} />
      <Route path="/modules/vpc" element={<P component={VPCPage} />} />
      <Route path="/modules/discovery" element={<P component={DiscoveryPage} />} />
      <Route path="/modules/discovery/:id" element={<P component={DiscoveryPage} />} />
      <Route path="/modules/backlog" element={<P component={BacklogPage} />} />
      <Route path="/modules/communication" element={<P component={CommunicationPage} />} />
      <Route path="/modules/requirements" element={<P component={RequirementsPage} />} />
      <Route path="/modules/process-mapping" element={<P component={ProcessMappingPage} />} />
      <Route path="/modules/meetings" element={<P component={MeetingsPage} />} />
      <Route path="/modules/ai-agent" element={<P component={AIAgentPage} />} />
      <Route path="/modules/raci" element={<P component={RaciPage} />} />
      <Route path="/modules/followups" element={<P component={FollowUpsPage} />} />
      <Route path="/modules/business-domains" element={<P component={BusinessDomainPage} />} />
      <Route path="/modules/executive-report" element={<P component={ExecutiveReportPage} />} />
      {/* Admin-only */}
      <Route path="/admin/users"          element={<A component={UsersPage} />} />
      <Route path="/settings/companies"   element={<P component={CompaniesPage} />} />
      <Route path="/settings/business-areas" element={<P component={BusinessAreasPage} />} />
      <Route path="/settings/integrations"   element={<P component={IntegrationsPage} />} />
      {/* Catch-all → login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ScienceThemeWrapper>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <CompanyProvider>
          <ProductProvider>
            <AppRoutes />
          </ProductProvider>
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
