import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import ExtratoPagamentos from "@/pages/ExtratoPagamentos";

// IMPORTANTE: Este componente (ContratoDetalhe) deve existir em src/pages/ContratoDetalhe.jsx
// para que as rotas dinâmicas abaixo funcionem.
import ContratoDetalhe from "@/pages/ContratoDetalhe"; 

// IMPORTANTE: Este componente (Layout) deve existir em src/components/layout/Layout.jsx
// Ele deve conter o <Sidebar> e o <Outlet /> para renderizar o conteúdo.
import Layout from "@/components/layout/Layout"; 

/**
 * App Component - Configuração Principal de Rotas da Sprint 9
 * Resolve os erros 404 de navegação dinâmica (/contratos/:id).
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota Raiz que renderiza o Layout Base (Sidebar + Topbar) */}
        <Route element={<Layout />}>
          
          {/* Página Principal do Dashboard */}
          <Route path="/" element={<Dashboard />} />
          
          {/* Página de Fiscalização e Auditoria (Requisito Sprint 9) */}
          <Route path="/extrato" element={<ExtratoPagamentos />} />
          
          {/* --- Rotas Dinâmicas de Contrato (/contratos/:id) --- */}
          
          {/* Rota Base de Detalhes do Contrato */}
          <Route path="/contratos/:id" element={<ContratoDetalhe />} />
          
          {/* Rota para Aba de Aditivos dentro do Detalhe (evita 404) */}
          <Route path="/contratos/:id/aditivos" element={<ContratoDetalhe tab="aditivos" />} />
          
          {/* Outras Abas Dinâmicas que podem ser necessárias no futuro */}
          <Route path="/contratos/:id/empenhos" element={<ContratoDetalhe tab="empenhos" />} />
          <Route path="/contratos/:id/itens" element={<ContratoDetalhe tab="itens" />} />
        
        </Route>

        {/* --- Fallback de Segurança --- */}
        {/* Se o usuário digitar uma rota não mapeada, redireciona para o Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}