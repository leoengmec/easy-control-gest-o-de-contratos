import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Eye, Pencil, Trash2, FileText, CalendarDays } from "lucide-react";
import ContratoForm from "@/components/contratos/ContratoForm.jsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const statusColors = { ativo: "text-green-600 border-green-200 bg-green-50", encerrado: "text-gray-600 border-gray-200 bg-gray-50", suspenso: "text-amber-600 border-amber-200 bg-amber-50" };

export default function Contratos() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    load();
  }, []);

  const load = () => {
    setLoading(true);
    base44.entities.Contrato.list("-created_date").then(data => {
      setContratos(data);
      setLoading(false);
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja excluir este contrato?")) return;
    await base44.entities.Contrato.delete(id);
    load();
  };

  const canEdit = user?.role === "admin" || user?.role === "gestor";

  const filtered = contratos.filter(c =>
    !search || c.numero?.toLowerCase().includes(search.toLowerCase()) ||
    c.contratada?.toLowerCase().includes(search.toLowerCase()) ||
    c.objeto?.toLowerCase().includes(search.toLowerCase())
  );

  if (showForm || editing) return (
    <div className="p-6 max-w-3xl mx-auto">
      <ContratoForm
        contrato={editing}
        onSave={() => { setShowForm(false); setEditing(null); load(); }}
        onCancel={() => { setShowForm(false); setEditing(null); }}
      />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1a2e4a]">Contratos</h1>
          <p className="text-gray-500 text-sm">{contratos.length} contrato(s) cadastrado(s)</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowForm(true)} className="bg-[#1a2e4a] hover:bg-[#2a4a7a]">
            <Plus className="w-4 h-4 mr-2" /> Novo Contrato
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <Input placeholder="Buscar por número, empresa ou objeto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div>Nenhum contrato encontrado</div>
          {canEdit && <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>Cadastrar primeiro contrato</Button>}
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-[#1a2e4a]">{c.numero}</span>
                      <Badge variant="outline" className={`text-xs ${statusColors[c.status]}`}>{c.status}</Badge>
                    </div>
                    <div className="text-sm font-medium text-gray-700 mb-1">{c.contratada}</div>
                    <div className="text-xs text-gray-500 mb-3 line-clamp-2">{c.objeto}</div>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {c.data_inicio ? format(new Date(c.data_inicio), "dd/MM/yyyy") : "—"} até {c.data_fim ? format(new Date(c.data_fim), "dd/MM/yyyy") : "—"}
                      </div>
                      <div className="font-semibold text-[#1a2e4a]">{fmt(c.valor_global)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={createPageUrl(`ContratoDetalhe?id=${c.id}`)}>
                      <Button variant="outline" size="sm" className="text-xs">
                        <Eye className="w-3 h-3 mr-1" /> Detalhar
                      </Button>
                    </Link>
                    {canEdit && (
                      <>
                        <Button variant="outline" size="icon" className="w-8 h-8" onClick={() => setEditing(c)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="icon" className="w-8 h-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(c.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}