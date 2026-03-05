import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  UserPlus, Mail, Shield, Users, Trash2, Bell, CheckCheck, AlertCircle, X
} from "lucide-react";

export const ROLES = [
  { value: "user",              label: "Usuário Básico",        color: "bg-gray-100 text-gray-600 border-gray-200",       desc: "Apenas visualização geral" },
  { value: "fiscal",            label: "Fiscal de Contrato",    color: "bg-green-100 text-green-700 border-green-200",    desc: "Lançamentos e controle de execução" },
  { value: "gestor",            label: "Gestor de Contratos",   color: "bg-blue-100 text-blue-700 border-blue-200",       desc: "Gestão completa de contratos" },
  { value: "analista_financeiro",label: "Analista Financeiro",  color: "bg-yellow-100 text-yellow-700 border-yellow-200", desc: "Orçamento, empenhos e relatórios" },
  { value: "direcao",           label: "Direção",               color: "bg-purple-100 text-purple-700 border-purple-200", desc: "Acesso amplo, sem administração" },
  { value: "admin",             label: "Administrador",         color: "bg-red-100 text-red-700 border-red-200",          desc: "Acesso total ao sistema" },
];

export const getRoleStyle = (role) => ROLES.find(r => r.value === role)?.color || "bg-gray-100 text-gray-600 border-gray-200";
export const getRoleLabel = (role) => ROLES.find(r => r.value === role)?.label || (role || "Usuário Básico");

// ── Painel de Notificações ──────────────────────────────────────────────────
function PainelNotificacoes({ onClose }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const carregar = () => {
    setLoading(true);
    base44.entities.NotificacaoAdmin.list("-created_date", 50)
      .then(setNotifs)
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const marcarLida = async (id) => {
    await base44.entities.NotificacaoAdmin.update(id, { lida: true });
    carregar();
  };

  const marcarTodasLidas = async () => {
    const naoLidas = notifs.filter(n => !n.lida);
    await Promise.all(naoLidas.map(n => base44.entities.NotificacaoAdmin.update(n.id, { lida: true })));
    carregar();
  };

  const excluir = async (id) => {
    await base44.entities.NotificacaoAdmin.delete(id);
    carregar();
  };

  const naoLidas = notifs.filter(n => !n.lida).length;

  return (
    <div className="fixed inset-0 z-[9990] flex items-start justify-end pt-16 pr-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-96 max-h-[80vh] flex flex-col border border-gray-200 z-10">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#1a2e4a]" />
            <span className="font-semibold text-[#1a2e4a] text-sm">Notificações</span>
            {naoLidas > 0 && <Badge className="bg-red-500 text-white text-xs px-1.5 py-0">{naoLidas}</Badge>}
          </div>
          <div className="flex gap-2">
            {naoLidas > 0 && (
              <button onClick={marcarTodasLidas} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                <CheckCheck className="w-3 h-3" /> Marcar todas
              </button>
            )}
            <button onClick={onClose}><X className="w-4 h-4 text-gray-400 hover:text-gray-700" /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Carregando...</div>
          ) : notifs.length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">Nenhuma notificação</div>
          ) : (
            notifs.map(n => (
              <div key={n.id} className={`flex gap-3 px-4 py-3 border-b last:border-0 ${n.lida ? "bg-white" : "bg-blue-50"}`}>
                <div className="mt-0.5 flex-shrink-0">
                  <AlertCircle className={`w-4 h-4 ${n.lida ? "text-gray-300" : "text-blue-500"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${n.lida ? "text-gray-500" : "text-gray-800"}`}>{n.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{n.mensagem}</p>
                  <p className="text-[10px] text-gray-300 mt-1">{n.created_date ? new Date(n.created_date).toLocaleString("pt-BR") : ""}</p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {!n.lida && (
                    <button onClick={() => marcarLida(n.id)} title="Marcar como lida" className="p-1 hover:bg-blue-100 rounded">
                      <CheckCheck className="w-3 h-3 text-blue-400" />
                    </button>
                  )}
                  <button onClick={() => excluir(n.id)} title="Excluir" className="p-1 hover:bg-red-50 rounded">
                    <Trash2 className="w-3 h-3 text-gray-300 hover:text-red-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────────────
export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [naoLidas, setNaoLidas] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const carregar = () => {
    setLoading(true);
    base44.entities.User.list()
      .then(setUsuarios)
      .finally(() => setLoading(false));
  };

  const carregarContadorNotifs = () => {
    base44.entities.NotificacaoAdmin.filter({ lida: false })
      .then(arr => setNaoLidas(arr.length))
      .catch(() => {});
  };

  useEffect(() => {
    carregar();
    carregarContadorNotifs();
    // Polling a cada 30s
    const interval = setInterval(carregarContadorNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole);
    setInviting(false);
    setInviteEmail("");
    setInviteRole("user");
    setShowInvite(false);
    setMsgSucesso("Convite enviado com sucesso!");
    setTimeout(() => setMsgSucesso(""), 4000);
    carregar();
  };

  const handleSaveRole = async (userId) => {
    setSaving(true);
    await base44.entities.User.update(userId, { role: editRole });
    setSaving(false);
    setEditingId(null);
    setMsgSucesso("Perfil atualizado!");
    setTimeout(() => setMsgSucesso(""), 3000);
    carregar();
  };

  const handleDelete = async (userId) => {
    await base44.entities.User.delete(userId);
    setConfirmDelete(null);
    setMsgSucesso("Usuário removido.");
    setTimeout(() => setMsgSucesso(""), 3000);
    carregar();
  };

  return (
    <div className="space-y-4">
      {/* Notificações overlay */}
      {showNotifs && (
        <PainelNotificacoes
          onClose={() => { setShowNotifs(false); carregarContadorNotifs(); }}
        />
      )}

      {msgSucesso && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          {msgSucesso}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold text-[#1a2e4a] flex items-center gap-2">
          <Users className="w-4 h-4" /> Gestão de Usuários
        </h2>
        <div className="flex items-center gap-2">
          {/* Sino de notificações */}
          <button
            onClick={() => setShowNotifs(true)}
            className="relative w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition"
            title="Notificações de novos usuários"
          >
            <Bell className="w-4 h-4 text-gray-600" />
            {naoLidas > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {naoLidas > 9 ? "9+" : naoLidas}
              </span>
            )}
          </button>
          <Button
            size="sm"
            className="bg-[#1a2e4a] hover:bg-[#2a4a7a] gap-1.5 text-xs"
            onClick={() => setShowInvite(!showInvite)}
          >
            <UserPlus className="w-3.5 h-3.5" /> Convidar Usuário
          </Button>
        </div>
      </div>

      {/* Info perfis */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {ROLES.map(r => (
          <div key={r.value} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${r.color}`}>{r.label}</Badge>
            <span className="text-[11px] text-gray-400 leading-tight">{r.desc}</span>
          </div>
        ))}
      </div>

      {/* Form convite */}
      {showInvite && (
        <Card className="border-blue-200 bg-blue-50/40">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-medium text-[#1a2e4a]">Convidar novo usuário</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="usuario@exemplo.com"
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Perfil inicial</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-gray-400">Novos usuários que se registrem sozinhos receberão o perfil <strong>Usuário Básico</strong> até que um administrador eleve o acesso.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowInvite(false)}>Cancelar</Button>
              <Button size="sm" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" onClick={handleInvite} disabled={inviting || !inviteEmail}>
                {inviting ? "Enviando..." : "Enviar Convite"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Carregando usuários...</div>
          ) : (
            <div className="divide-y">
              {usuarios.map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#1a2e4a] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{u.full_name || "—"}</div>
                      <div className="text-xs text-gray-400 truncate">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {editingId === u.id ? (
                      <>
                        <Select value={editRole} onValueChange={setEditRole}>
                          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8 text-xs bg-[#1a2e4a] hover:bg-[#2a4a7a]" onClick={() => handleSaveRole(u.id)} disabled={saving}>
                          {saving ? "..." : "Salvar"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingId(null)}>
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Badge variant="outline" className={`text-xs ${getRoleStyle(u.role)}`}>
                          {getRoleLabel(u.role)}
                        </Badge>
                        <button
                          title="Alterar perfil"
                          className="p-1.5 hover:bg-gray-100 rounded"
                          onClick={() => { setEditingId(u.id); setEditRole(u.role || "user"); }}
                        >
                          <Shield className="w-3.5 h-3.5 text-gray-400 hover:text-blue-600" />
                        </button>
                        {confirmDelete === u.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-500">Confirmar?</span>
                            <button className="text-xs text-red-600 font-semibold hover:underline" onClick={() => handleDelete(u.id)}>Sim</button>
                            <button className="text-xs text-gray-400 hover:underline" onClick={() => setConfirmDelete(null)}>Não</button>
                          </div>
                        ) : (
                          <button
                            title="Remover usuário"
                            className="p-1.5 hover:bg-red-50 rounded"
                            onClick={() => setConfirmDelete(u.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-500" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}