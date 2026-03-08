import { useState } from "react";
import { Users, Shield, UserCog, Eye, Loader2, UserX, Pencil, Trash2, Plus, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const roleConfig: Record<string, { icon: typeof Shield; label: string; className: string }> = {
  admin: { icon: Shield, label: "Admin", className: "bg-destructive/10 text-destructive" },
  gestor: { icon: UserCog, label: "Gestor", className: "bg-primary/10 text-primary" },
  operador: { icon: Eye, label: "Operador", className: "bg-muted text-muted-foreground" },
};

interface UserRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  role: string;
}

function useUsers() {
  return useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, phone, tenant_id")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (rolesError) throw rolesError;

      const roleMap = new Map<string, string>();
      (roles || []).forEach((r) => roleMap.set(r.user_id, r.role));

      return (profiles || []).map((p) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.full_name || "Sem nome",
        phone: p.phone,
        role: roleMap.get(p.user_id) || "operador",
      }));
    },
  });
}

async function callManageUsers(action: string, params: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("manage-users", {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message);
  if (!data.success) throw new Error(data.error);
  return data;
}

export default function UsersPage({ embedded = false }: { embedded?: boolean }) {
  const { data: users = [], isLoading } = useUsers();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState("operador");

  const openCreate = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormRole("operador");
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail("");
    setFormPhone(u.phone || "");
    setFormRole(u.role);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingUser) {
        // Update profile
        await callManageUsers("update_user", {
          user_id: editingUser.user_id,
          full_name: formName,
          phone: formPhone || null,
        });
        // Update role if changed
        if (formRole !== editingUser.role) {
          await callManageUsers("update_role", {
            user_id: editingUser.user_id,
            role: formRole,
          });
        }
        toast.success("Usuário atualizado com sucesso");
      } else {
        if (!formEmail.trim()) {
          toast.error("E-mail é obrigatório");
          setSaving(false);
          return;
        }
        await callManageUsers("invite_user", {
          email: formEmail.trim(),
          full_name: formName,
          role: formRole,
        });
        toast.success("Usuário criado com sucesso");
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setSaving(true);
    try {
      await callManageUsers("delete_user", { user_id: deleteUser.user_id });
      toast.success("Usuário excluído com sucesso");
      setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir usuário");
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mb-4 text-accent" />
        <p className="text-lg font-semibold">Acesso restrito</p>
        <p className="text-sm">Apenas administradores podem gerenciar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {`${users.length} usuários cadastrados`}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <UserX className="h-12 w-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">Nenhum usuário encontrado</p>
          <p className="text-sm">Cadastre usuários para gerenciar o acesso ao sistema.</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                <th className="text-left py-3 px-4 font-medium">Usuário</th>
                <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">Telefone</th>
                <th className="text-center py-3 px-4 font-medium">Perfil</th>
                <th className="text-right py-3 px-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {users.map((user) => {
                  const role = roleConfig[user.role] || roleConfig.operador;
                  const isSelf = user.user_id === currentUser?.id;
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                            {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium">{user.name}</span>
                            {isSelf && (
                              <span className="ml-2 text-[10px] text-muted-foreground">(você)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                        {user.phone || "—"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant="outline" className={`text-[11px] ${role.className}`}>
                          {role.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(user)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteUser(user)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Atualize os dados e o perfil de acesso do usuário."
                : "Preencha os dados para criar um novo usuário no sistema."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nome completo</Label>
              <Input
                id="name"
                placeholder="Nome do usuário"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de acesso</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingUser ? "Salvar" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUser?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
