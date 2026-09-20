import { NavLink, Route, Routes } from "react-router-dom";
import { SuppliersListPage } from "./pages/suppliers/SuppliersListPage";
import { SupplierDetailPage } from "./pages/suppliers/SupplierDetailPage";
import { ComponentsListPage } from "./pages/components/ComponentsListPage";
import { ComponentDetailPage } from "./pages/components/ComponentDetailPage";
import { BomListPage } from "./pages/planning/BomListPage";
import { ScenariosListPage } from "./pages/planning/ScenariosListPage";
import { ScenarioDetailPage } from "./pages/planning/ScenarioDetailPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { UsersPage } from "./pages/auth/UsersPage";
import { useAuth } from "./auth/AuthContext";

export default function App() {
  const { user, loading, logout } = useAuth();

  if (loading) return null;
  if (!user) return <LoginPage />;

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <h1>Suprimentos</h1>
        <div className="group-label">Módulo A — Cadastros</div>
        <NavLink to="/fornecedores" className={({ isActive }) => (isActive ? "active" : "")}>
          Fornecedores
        </NavLink>
        <NavLink to="/componentes" className={({ isActive }) => (isActive ? "active" : "")}>
          Componentes
        </NavLink>
        <div className="group-label">Módulo B — Planejamento</div>
        <NavLink to="/lmc" className={({ isActive }) => (isActive ? "active" : "")}>
          LMC
        </NavLink>
        <NavLink to="/cenarios" className={({ isActive }) => (isActive ? "active" : "")}>
          Cenários
        </NavLink>
        {user.role === "ADMIN" && (
          <>
            <div className="group-label">Administração</div>
            <NavLink to="/usuarios" className={({ isActive }) => (isActive ? "active" : "")}>
              Usuários
            </NavLink>
          </>
        )}
        <div style={{ marginTop: 24, padding: "0 20px" }}>
          <p className="small muted" style={{ margin: "0 0 6px" }}>
            {user.name}
          </p>
          <button className="btn btn-sm" onClick={logout} style={{ width: "100%" }}>
            Sair
          </button>
        </div>
      </nav>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<ScenariosListPage />} />
          <Route path="/fornecedores" element={<SuppliersListPage />} />
          <Route path="/fornecedores/:id" element={<SupplierDetailPage />} />
          <Route path="/componentes" element={<ComponentsListPage />} />
          <Route path="/componentes/:id" element={<ComponentDetailPage />} />
          <Route path="/lmc" element={<BomListPage />} />
          <Route path="/cenarios" element={<ScenariosListPage />} />
          <Route path="/cenarios/:id" element={<ScenarioDetailPage />} />
          {user.role === "ADMIN" && <Route path="/usuarios" element={<UsersPage />} />}
        </Routes>
      </main>
    </div>
  );
}
