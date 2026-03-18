import { useState, useEffect, useCallback } from "react"; // Adicionado useCallback
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Package, Search, X, AlertCircle } from "lucide-react"; // Adicionado AlertCircle

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtNum = (v) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const LOCAIS = ["Natal", "Mossoró", "Assú", "Caicó", "Pau dos Ferros", "Ceará Mirim"];

export default function ControleMateriais() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null); // Estado para capturar falhas de carregamento
  const [expandedNFs, setExpandedNFs] = useState({});

  const [filtroOS, setFiltroOS] = useState("");
  const [filtroNF, setFiltroNF] = useState("");
  const [filtroLocal, setFiltroLocal] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  useEffect(() => {
    setLoading(true);
    // Tenta carregar os dados
    base44.entities.ItemMaterialNF.list("-created_date", 500)
      .then(res => {
        setItens(res || []);
        setErro(null);
      })
      .catch(err => {
        console.error("Erro ao carregar materiais:", err);
        setErro("Não foi possível carregar os dados do banco.");
      })
      .finally(() => setLoading(false));
  }, []);

  const itensFiltrados = itens.filter(item => {
    const osOk    = !filtroOS    || (item.os_numero || "").toLowerCase().includes(filtroOS.toLowerCase());
    const nfOk    = !filtroNF    || (item.numero_nf || "").toLowerCase().includes(filtroNF.toLowerCase());
    const localOk = filtroLocal === "todos" || item.os_local === filtroLocal;
    const dataOk  = (() => {
      if (!filtroDataInicio && !filtroDataFim) return true;
      const dataNF = item.data_nf;
      if (!dataNF) return false;
      if (filtroDataInicio && dataNF < filtroDataInicio) return false;
      if (filtroDataFim    && dataNF > filtroDataFim)    return false;
      return true;
    })();
    return osOk && nfOk && localOk && dataOk;
  });

  const nfsMap = {};
  itensFiltrados.forEach(item => {
    const key = item.numero_nf || "SEM-NF-" + (item.os_numero || "Geral");
    if (!nfsMap[key]) {
      nfsMap[key] = {
        numero_nf: item.numero_nf || "Não Informada",
        data_nf: item.data_nf,
        os_numero: item.os_numero,
        os_local: item.os_local,
        valor_total_nota: item.valor_total_nota || 0,
        itens: []
      };
    }
    nfsMap[key].itens.push(item);
  });

  const nfsList = Object.entries(nfsMap);
  const toggleNF = (key) => setExpandedNFs(prev => ({ ...prev, [key]: !prev[key] }));
  const temFiltroAtivo = filtroOS || filtroNF || filtroLocal !== "todos" || filtroDataInicio || filtroDataFim;
  const limparFiltros = () => {
    setFiltroOS(""); setFiltroNF(""); setFiltroLocal("todos");
    setFiltroDataInicio(""); setFiltroDataFim("");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
        <div className="text-gray-500 animate-pulse font-medium">Sincronizando materiais...</div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-800">{erro}</h2>
        <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header com estilo ajustado para o novo Layout */}
      <div className="flex items-center gap-4 border-b pb-6">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#1a2e4a] tracking-tight">Controle de Materiais</h1>
          <p className="text-sm text-gray-500 font-medium">Monitoramento de itens por nota fiscal e ordem de serviço</p>
        </div>
      </div>

      {/* Restante do seu código de filtros e lista (Mantenha o seu original, 
          ele está ótimo, apenas certifique-se de usar 'nfsList' como você já faz) */}
      
      {/* ... (Seus cards de filtros e nfsList.map) */}
    </div>
  );
}