import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, Search, Eye, Pencil, Trash2, FileText, CalendarDays, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import ContratoForm from "@/components/contratos/ContratoForm.jsx";
import { format } from "date-fns";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const statusColors = { ativo: "text-green-600 border-green-200 bg-green-50", encerrado: "text-gray-600 border-gray-200 bg-gray-50", suspenso: "text-amber-600 border-amber-200 bg-amber-50" };
const PER_PAGE = 10;

export default function Contratos() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [user, setUser] = useState(null);
  const [page, setPage] = useState(1);

  // Filtros
  const [search, setSearch] = useState("");
  const [filtStatus, setFiltStatus] = useState("todos");
  const [filtDataInicio, setFiltDataInicio] = useState("");
  const [filtDataFim, setFiltDataFim] = useState("");
  const [showFiltros, setShowFiltros] = useState(false);

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

  const filtered = contratos.filter(c => {
    if (search) {
      const s = search.toLowerCase();
      if (!c.numero?.toLowerCase().includes(s) && !c.contratada?.toLowerCase().includes(s) && !c.objeto?.toLowerCase().includes(s)) return false;
    }
    if (filtStatus !== "todos" && c.status !== filtStatus) return false;
    if (filtDataInicio && c.data_inicio < filtDataInicio) return false;
    if (filtDataFim && c.data_fim > filtDataFim) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const clearFiltros = () => { setFiltStatus("todos"); setFiltDataInicio(""); setFiltDataFim(""); setPage(1); };
  const hasActiveFiltros = filtStatus !== "todos" || filtDataInicio || filtDataFim;

  const handleSearch = (v) => { setSearch(v); setPage(1); };

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
          <p className="text-gray-500 text-sm">{contratos.length} contrato(s) cadastrado(s) · {filtered.length} encontrado(s)</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowForm(true)} className="bg-[#1a2e4a] hover:bg-[#2a4a7a]">
            <Plus className="w-4 h-4 mr-2" /> Novo Contrato
          </Button>
        )}
      </div>

      {/* Barra de busca + filtros */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por número, empresa ou objeto..."
              className="pl-9"
              value={search}
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
          <Button
            variant={showFiltros ? "default" : "outline"}
            onClick={() => setShowFiltros(v => !v)}
            className="shrink-0"
          >
            <Filter className="w-4 h-4 mr-1" />
            Filtros
            {hasActiveFiltros && <Badge className="ml-1 text-xs px-1 py-0 h-4 bg-white text-[#1a2e4a]">{[filtStatus !== "todos", !!filtDataInicio, !!filtDataFim].filter(Boolean).length}</Badge>}
          </Button>
        </div>

        {showFiltros && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={filtStatus} onValueChange={v => { setFiltStatus(v); setPage(1); }}>
                    <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="encerrado">Encerrado</SelectItem>
                      <SelectItem value="suspenso">Suspenso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Início a partir de</Label>
                  <Input type="date" value={filtDataInicio} onChange={e => { setFiltDataInicio(e.target.value); setPage(1); }} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vigência até</Label>
                  <Input type="date" value={filtDataFim} onChange={e => { setFiltDataFim(e.target.value); setPage(1); }} className="text-sm" />
                </div>
              </div>
              {hasActiveFiltros && (
                <Button variant="ghost" size="sm" onClick={clearFiltros} className="mt-3 text-xs text-gray-500">
                  <X className="w-3 h-3 mr-1" /> Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : paginated.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <div>Nenhum contrato encontrado</div>
          {canEdit && <Button variant="outline" className="mt-3" onClick={() => setShowForm(true)}>Cadastrar primeiro contrato</Button>}
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {paginated.map(c => (
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

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Button
                  key={p}
                  variant={p === page ? "default" : "outline"}
                  size="sm"
                  className={`w-8 h-8 text-xs ${p === page ? "bg-[#1a2e4a]" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-xs text-gray-400 ml-2">Página {page} de {totalPages}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}