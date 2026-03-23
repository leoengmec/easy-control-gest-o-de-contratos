import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Users, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novoEmail, setNovoEmail] = useState("");
  const [novoPerfil, setNovoPerfil] = useState("Gestor");
  const [novoNome, setNovoNome] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Usuario.list();
      setUsuarios(data || []);
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAtualizarPerfil = async (usuarioId, novoPerfil) => {
    try {
      await base44.entities.Usuario.update(usuarioId, { perfil: novoPerfil });
      toast({
        title: "Perfil atualizado",
        description: `O perfil foi atualizado para ${novoPerfil} com sucesso.`,
      });
      carregarUsuarios();
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar o perfil do usuário.",
        variant: "destructive"
      });
    }
  };

  const handleConvidarUsuario = async (e) => {
    e.preventDefault();
    if (!novoEmail || !novoNome) return;

    try {
      // 1. Cria a entidade Usuario no banco para manter o RLS e perfis
      await base44.entities.Usuario.create({
        nome: novoNome,
        email: novoEmail,
        perfil: novoPerfil,
        ativo: true,
        contratos_vinculados: []
      });

      // 2. Dispara o convite pela plataforma
      await base44.users.inviteUser(novoEmail, novoPerfil === "Administrador" ? "admin" : "user");

      toast({
        title: "Convite enviado!",
        description: `Um convite foi enviado para ${novoEmail}.`,
      });

      setNovoEmail("");
      setNovoNome("");
      setNovoPerfil("Gestor");
      carregarUsuarios();
    } catch (error) {
      console.error("Erro ao convidar usuário:", error);
      toast({
        title: "Erro",
        description: "Falha ao enviar convite ou criar registro.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-black text-[#1a2e4a]">Administração de Acessos</h1>
          <p className="text-sm text-slate-500">Gerencie os perfis de usuários e convites do sistema.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Painel de Convite */}
        <Card className="md:col-span-1 shadow-md border-none">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2 text-[#1a2e4a]">
              <Mail className="w-4 h-4 text-blue-500" /> Convidar Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleConvidarUsuario} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">Nome Completo</label>
                <Input 
                  placeholder="Ex: João da Silva" 
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">E-mail Profissional</label>
                <Input 
                  type="email" 
                  placeholder="email@jfrn.jus.br" 
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500">Perfil Inicial</label>
                <Select value={novoPerfil} onValueChange={setNovoPerfil}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrador">Administrador</SelectItem>
                    <SelectItem value="Gestor">Gestor</SelectItem>
                    <SelectItem value="Terceirizada">Terceirizada</SelectItem>
                    <SelectItem value="Operacional">Operacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Enviar Convite
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card className="md:col-span-2 shadow-md border-none">
          <CardHeader className="bg-slate-50 border-b pb-4">
            <CardTitle className="text-base flex items-center gap-2 text-[#1a2e4a]">
              <Users className="w-4 h-4 text-blue-500" /> Usuários Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Perfil de Acesso</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : usuarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      Nenhum usuário cadastrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  usuarios.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nome}</TableCell>
                      <TableCell className="text-slate-500 text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Select 
                          defaultValue={user.perfil} 
                          onValueChange={(val) => handleAtualizarPerfil(user.id, val)}
                        >
                          <SelectTrigger className="h-8 text-xs w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Administrador">Administrador</SelectItem>
                            <SelectItem value="Gestor">Gestor</SelectItem>
                            <SelectItem value="Terceirizada">Terceirizada</SelectItem>
                            <SelectItem value="Operacional">Operacional</SelectItem>
                            <SelectItem value="Pendente">Pendente</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.ativo ? (
                          <div className="flex items-center justify-center gap-1 text-green-600 text-xs font-bold bg-green-50 py-1 px-2 rounded-full mx-auto w-max">
                            <CheckCircle2 className="w-3 h-3" /> Ativo
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-red-600 text-xs font-bold bg-red-50 py-1 px-2 rounded-full mx-auto w-max">
                            <AlertCircle className="w-3 h-3" /> Inativo
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}