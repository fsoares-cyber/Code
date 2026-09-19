import { NavLink, Route, Routes } from "react-router-dom";
import { SuppliersListPage } from "./pages/suppliers/SuppliersListPage";
import { SupplierDetailPage } from "./pages/suppliers/SupplierDetailPage";
import { ComponentsListPage } from "./pages/components/ComponentsListPage";
import { ComponentDetailPage } from "./pages/components/ComponentDetailPage";
import { BomListPage } from "./pages/planning/BomListPage";
import { ScenariosListPage } from "./pages/planning/ScenariosListPage";
import { ScenarioDetailPage } from "./pages/planning/ScenarioDetailPage";

export default function App() {
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
        </Routes>
      </main>
    </div>
  );
}
