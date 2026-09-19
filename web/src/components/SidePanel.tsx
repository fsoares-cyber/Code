import type { ReactNode } from "react";

interface SidePanelProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

// Painel lateral usado pelo Módulo B para abrir o cadastro (Módulo A) sem
// sair da tela de planejamento — ex.: "adicionar fornecedor a este componente".
export function SidePanel({ title, onClose, children }: SidePanelProps) {
  return (
    <div className="side-panel-overlay" onClick={onClose}>
      <div className="side-panel" onClick={(e) => e.stopPropagation()}>
        <div className="side-panel-header">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn btn-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
