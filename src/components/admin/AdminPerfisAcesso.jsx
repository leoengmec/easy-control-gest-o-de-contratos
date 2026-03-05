import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Users, Pencil, Check, X, Info } from "lucide-react";
import { ROLES } from "./AdminUsuarios";

const STORAGE_KEY = "easer_perfis_customizados";

function carregarPerfisCustomizados() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function salvarPerfisCustomizados(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function AdminPerfisAcesso() {
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(true);
  const [customizacoes, setCustomizacoes] = useState(carregarPerfisCustomizados());
  const [editando, setEditando] = useState(null); // value do role
  const [editLabel, setEditLabel] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [msgSucesso, setMsgSucesso] = useState("");

  useEffect(() => {
    base44.entities.User.list()
      .then(setUsuarios)
      .finally(() => setLoadingUsuarios(false));
  }, []);

  const getLabel = (role) => customizacoes[role.value]?.label || role.label;
  const getDesc  = (role) => customizacoes[role.value]?.desc  || role.desc;

  const iniciarEdicao = (role) => {
    setEditando(role.value);
    setEditLabel(getLabel(role));
    setEditDesc(getDesc(role));
  };

  const cancelarEdicao = () => setEditando(null);

  const salvarEdicao = (roleValue) => {
    const novas = {
      ...customizacoes,
      [roleValue]: { label: editLabel, desc: editDesc },
    };
    setCustomizacoes(novas);
    salvarPerfisCustomizados(novas);
    setEditando(null);
    setMsgSucesso("Perfil atualizado com sucesso!");
    setTimeout(() => setMsgSucesso(""), 3000);
  };

  const contarUsuarios = (roleValue) =>
    usuarios.filter(u => (u.role || "user") === roleValue).length;

  return (
    <div className="space-y-4">
      {msgSucesso && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          {msgSucesso}
        </div>
      )}

      {/* Header info */}
      <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>
          Os perfis de acesso definem o que cada usuário pode ver e fazer no sistema.
          Você pode personalizar o <strong>nome</strong> e a <strong>descrição</strong> de cada perfil.
          As permissões técnicas (quais módulos cada perfil acessa) são definidas no código.
        </p>
      </div>

      {/* Cards de perfis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ROLES.map(role => {
          const isEditando = editando === role.value;
          const totalUsuarios = contarUsuarios(role.value);

          return (
            <Card key={role.value} className={`border ${isEditando ? "border-blue-300 shadow-md" : "border-gray-200"}`}>
              <CardContent className="pt-4 pb-4 space-y-3">
                {/* Topo: badge + ações */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 ${role.color}`}>
                    {isEditando ? editLabel || role.value : getLabel(role)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="w-3 h-3" />
                      {loadingUsuarios ? "..." : totalUsuarios}
                    </span>
                    {!isEditando && (
                      <button
                        className="p-1.5 hover:bg-gray-100 rounded"
                        title="Editar perfil"
                        onClick={() => iniciarEdicao(role)}
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Código do role */}
                <div className="text-[10px] text-gray-300 font-mono">
                  role: <span className="text-gray-400">{role.value}</span>
                </div>

                {isEditando ? (
                  /* Modo edição */
                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do Perfil</Label>
                      <Input
                        value={editLabel}
                        onChange={e => setEditLabel(e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Ex: Gestor de Contratos"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <Input
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Ex: Gestão completa de contratos"
                      />
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={cancelarEdicao}>
                        <X className="w-3 h-3" /> Cancelar
                      </Button>
                      <Button size="sm" className="h-7 text-xs bg-[#1a2e4a] hover:bg-[#2a4a7a] gap-1" onClick={() => salvarEdicao(role.value)}>
                        <Check className="w-3 h-3" /> Salvar
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Modo visualização */
                  <p className="text-xs text-gray-500 leading-relaxed">{getDesc(role)}</p>
                )}

                {/* Usuários com este perfil */}
                {!isEditando && !loadingUsuarios && totalUsuarios > 0 && (
                  <div className="pt-1 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1 mt-1">
                      {usuarios
                        .filter(u => (u.role || "user") === role.value)
                        .slice(0, 5)
                        .map(u => (
                          <span key={u.id} className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                            <div className="w-3 h-3 rounded-full bg-[#1a2e4a] flex items-center justify-center text-white text-[8px] font-bold">
                              {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                            </div>
                            {u.full_name || u.email}
                          </span>
                        ))}
                      {totalUsuarios > 5 && (
                        <span className="text-[10px] text-gray-400">+{totalUsuarios - 5} mais</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}