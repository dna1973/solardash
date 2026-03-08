import { Users, Shield, UserCog, Eye, Loader2, UserX } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const roleConfig: Record<string, { icon: typeof Shield; label: string; className: string }> = {
  admin: { icon: Shield, label: "Admin", className: "bg-energy-red-light text-destructive" },
  gestor: { icon: UserCog, label: "Gestor", className: "bg-energy-blue-light text-energy-blue" },
  operador: { icon: Eye, label: "Operador", className: "bg-muted text-muted-foreground" },
};

function useUsers() {
  return useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url, phone, tenant_id")
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
        role: roleMap.get(p.user_id) || "operador",
      }));
    },
  });
}

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${users.length} usuários cadastrados`}
          </p>
        </div>
        <button className="gradient-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
          + Novo Usuário
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
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
                <th className="text-center py-3 px-4 font-medium">Perfil</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const role = roleConfig[user.role] || roleConfig.operador;
                return (
                  <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant="outline" className={`text-[11px] ${role.className}`}>
                        {role.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
