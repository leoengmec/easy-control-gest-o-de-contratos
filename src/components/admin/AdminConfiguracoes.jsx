import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, MapPin, Tag, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const LOCAIS_PADRAO = ["Natal", "Mossoró", "Assú", "Caicó", "Pau dos Ferros", "Ceará Mirim"];
const CATEGORIAS_PADRAO = [
  "Deslocamento Corretivo",
  "Deslocamento Preventivo",
  "Locações",
  "MOR Natal",
  "MOR Mossoró",
  "Serviços eventuais",
  "Fornecimento de Materiais",
];

const STATUS_LANCAMENTO_PADRAO = ["SOF", "Pago", "Cancelado", "Aprovisionado", "Em execução", "Em instrução"];

function InfoSection({ icon: Icon, title, desc, items, color }) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#1a2e4a]">{title}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <Badge key={item} variant="outline" className="text-xs bg-gray-50">
              {item}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-gray-400 italic">
          Para alterar estes valores, é necessário editar o código-fonte do sistema.
        </p>
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
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-4 h-4 text-[#1a2e4a]" />
        <h2 className="text-base font-semibold text-[#1a2e4a]">Configurações do Sistema</h2>
      </div>

      <ContratosResumo />

      <InfoSection
        icon={MapPin}
        title="Locais de Prestação de Serviço"
        desc="Locais disponíveis para seleção nos lançamentos e notas fiscais"
        items={LOCAIS_PADRAO}
        color="bg-orange-100 text-orange-700"
      />

      <InfoSection
        icon={Tag}
        title="Categorias de Lançamento"
        desc="Categorias disponíveis ao criar um lançamento financeiro"
        items={CATEGORIAS_PADRAO}
        color="bg-indigo-100 text-indigo-700"
      />

      <InfoSection
        icon={Settings}
        title="Status de Lançamentos"
        desc="Status disponíveis para os lançamentos financeiros"
        items={STATUS_LANCAMENTO_PADRAO}
        color="bg-teal-100 text-teal-700"
      />
    </div>
  );
}