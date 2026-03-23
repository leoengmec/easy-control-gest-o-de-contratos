import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "@/components/Layout"; // Ajuste o caminho se necessário
import Dashboard from "@/pages/Dashboard";
import ExtratoPagamentos from "@/pages/ExtratoPagamentos";
import ContratoDetalhe from "@/pages/ContratoDetalhe"; 

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* O Layout envolve todas as rotas para exibir a Sidebar e o Header */}
        <Route element={<Layout />}>
          
          {/* Dashboard - Gestão Inteligente */}
          <Route path="/" element={<Dashboard />} />
          
          {/* Extrato - Controle Financeiro */}
          <Route path="/extrato" element={<ExtratoPagamentos />} />
          
          {/* Fiscalização Contratual - Rotas Dinâmicas */}
          <Route path="/contratos/:id" element={<ContratoDetalhe />} />
          <Route path="/contratos/:id/aditivos" element={<ContratoDetalhe tab="aditivos" />} />
          <Route path="/contratos/:id/empenhos" element={<ContratoDetalhe tab="empenhos" />} />
          
          {/* Rotas de fallback para itens do menu ainda não implementados */}
          <Route path="/contratos" element={<Navigate to="/" replace />} />
          <Route path="/relatorios" element={<Navigate to="/" replace />} />
        </Route>

        {/* Fallback Geral */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}