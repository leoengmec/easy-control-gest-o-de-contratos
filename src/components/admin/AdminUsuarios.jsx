import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Mail, Shield, Users } from "lucide-react";

const ROLES = [
  { value: "admin",   label: "Administrador", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "gestor",  label: "Gestor",        color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "fiscal",  label: "Fiscal",        color: "bg-green-100 text-green-700 border-green-200" },
  { value: "direcao", label: "Direção",       color: "bg-purple-100 text-purple-700 border-purple-200" },
];

const getRoleStyle = (role) => ROLES.find(r => r.value === role)?.color || "bg-gray-100 text-gray-600 border-gray-200";
const getRoleLabel = (role) => ROLES.find(r => r.value === role)?.label || role;

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("fiscal");
  const [inviting, setInviting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState("");

  const carregar = () => {
    setLoading(true);
    base44.entities.User.list()
      .then(setUsuarios)
      .finally(() => setLoading(false));
  };

  useEffect(() => { carregar(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole);
    setInviting(false);
    setInviteEmail("");
    setInviteRole("fiscal");
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
    carregar();
  };

  return (
    <div className="space-y-4">
      {msgSucesso && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
          {msgSucesso}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#1a2e4a] flex items-center gap-2">
          <Users className="w-4 h-4" /> Usuários do Sistema
        </h2>
        <Button
          size="sm"
          className="bg-[#1a2e4a] hover:bg-[#2a4a7a] gap-1.5 text-xs"
          onClick={() => setShowInvite(!showInvite)}
        >
          <UserPlus className="w-3.5 h-3.5" /> Convidar Usuário
        </Button>
      </div>

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
                <Label className="text-xs">Perfil</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowInvite(false)}>Cancelar</Button>
              <Button size="sm" className="bg-[#1a2e4a] hover:bg-[#2a4a7a]" onClick={handleInvite} disabled={inviting || !inviteEmail}>
                {inviting ? "Enviando..." : "Enviar Convite"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-gray-400 hover:text-gray-700"
                          onClick={() => { setEditingId(u.id); setEditRole(u.role || "fiscal"); }}
                        >
                          <Shield className="w-3.5 h-3.5" />
                        </Button>
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