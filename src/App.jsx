import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Contratos from "./pages/Contratos";
import ContratoDetalhe from "./pages/ContratoDetalhe";
import Empenhos from "./pages/Empenhos";
import ExtratoPagamentos from "./pages/ExtratoPagamentos"; // Nova página

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Redireciona a raiz para o Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contratos" element={<Contratos />} />
          <Route path="/contrato-detalhe" element={<ContratoDetalhe />} />
          <Route path="/empenhos" element={<Empenhos />} />
          
          {/* Rota do Extrato revisado com filtros múltiplos */}
          <Route path="/extrato-pagamentos" element={<ExtratoPagamentos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}