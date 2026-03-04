import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, MapPin, Tag, Plus, X, Pencil, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const CONFIG_KEY = "admin_configuracoes";

const DEFAULTS = {
  locais: ["Natal", "Mossoró", "Assú", "Caicó", "Pau dos Ferros", "Ceará Mirim"],
  categorias: [
    "Deslocamento Corretivo",
    "Deslocamento Preventivo",
    "Locações",
    "MOR Natal",
    "MOR Mossoró",
    "Serviços eventuais",
    "Fornecimento de Materiais",
  ],
  status: ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução"],
};

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function EditableList({ icon: Icon, title, desc, color, items, onSave }) {
  const [editing, setEditing] = useState(false);
  const [list, setList] = useState(items);
  const [newItem, setNewItem] = useState("");

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
      setNewItem("");
    }
  };

  const handleRemove = (item) => setList(list.filter(i => i !== item));

  const handleSave = () => {
    onSave(list);
    setEditing(false);
  };

  const handleCancel = () => {
    setList(items);
    setEditing(false);
    setNewItem("");
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a2e4a]">{title}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
          </div>
          {!editing && (
            <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => setEditing(true)}>
              <Pencil className="w-3 h-3" /> Editar
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {list.map(item => (
            <Badge key={item} variant="outline" className="text-xs bg-gray-50 gap-1">
              {item}
              {editing && (
                <button onClick={() => handleRemove(item)} className="ml-1 text-red-400 hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>

        {editing && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAdd()}
                placeholder="Novo item..."
                className="border rounded px-3 py-1.5 text-sm flex-1 outline-none focus:ring-1 focus:ring-blue-400"
              />
              <Button size="sm" variant="outline" className="text-xs h-8 gap-1" onClick={handleAdd}>
                <Plus className="w-3 h-3" /> Adicionar
              </Button>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" className="text-xs" onClick={handleCancel}>Cancelar</Button>
              <Button size="sm" className="text-xs bg-[#1a2e4a] text-white hover:bg-[#2a4a7a] gap-1" onClick={handleSave}>
                <Check className="w-3 h-3" /> Salvar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContratosResumo() {
  const [contratos, setContratos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Contrato.list().then(setContratos).finally(() => setLoading(false));
  }, []);

  const ativos = contratos.filter(c => c.status === "ativo").length;
  const encerrados = contratos.filter(c => c.status === "encerrado").length;
  const suspensos = contratos.filter(c => c.status === "suspenso").length;

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-100 text-blue-700">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1a2e4a]">Resumo de Contratos</p>
            <p className="text-xs text-gray-400">Visão geral dos contratos cadastrados</p>
          </div>
        </div>
        {loading ? (
          <p className="text-xs text-gray-400">Carregando...</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="text-xl font-bold text-green-700">{ativos}</div>
              <div className="text-xs text-green-600">Ativos</div>
            </div>
            <div className="text-center bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-xl font-bold text-gray-600">{encerrados}</div>
              <div className="text-xs text-gray-500">Encerrados</div>
            </div>
            <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="text-xl font-bold text-yellow-700">{suspensos}</div>
              <div className="text-xs text-yellow-600">Suspensos</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminConfiguracoes() {
  const [config, setConfig] = useState(loadConfig);

  const handleSave = (key) => (newList) => {
    const updated = { ...config, [key]: newList };
    setConfig(updated);
    saveConfig(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-[#1a2e4a]" />
        <h2 className="text-base font-semibold text-[#1a2e4a]">Configurações do Sistema</h2>
      </div>

      <ContratosResumo />

      <EditableList
        icon={MapPin}
        title="Locais de Prestação de Serviço"
        desc="Locais disponíveis para seleção nos lançamentos e notas fiscais"
        color="bg-orange-100 text-orange-700"
        items={config.locais}
        onSave={handleSave("locais")}
      />

      <EditableList
        icon={Tag}
        title="Categorias de Lançamento"
        desc="Categorias disponíveis ao criar um lançamento financeiro"
        color="bg-indigo-100 text-indigo-700"
        items={config.categorias}
        onSave={handleSave("categorias")}
      />

      <EditableList
        icon={Settings}
        title="Status de Lançamentos"
        desc="Status disponíveis para os lançamentos financeiros"
        color="bg-teal-100 text-teal-700"
        items={config.status}
        onSave={handleSave("status")}
      />
    </div>
  );
}