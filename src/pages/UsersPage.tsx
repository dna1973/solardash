import { Users, Shield, UserCog, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

const mockUsers = [
  { id: '1', name: 'Admin Global', email: 'admin@solarhub.com', role: 'admin', status: 'active' },
  { id: '2', name: 'Carlos Mendes', email: 'carlos@clienteA.com', role: 'gestor', status: 'active' },
  { id: '3', name: 'Ana Silva', email: 'ana@clienteA.com', role: 'operador', status: 'active' },
  { id: '4', name: 'Roberto Lima', email: 'roberto@clienteB.com', role: 'gestor', status: 'active' },
  { id: '5', name: 'Maria Santos', email: 'maria@clienteB.com', role: 'operador', status: 'inactive' },
];

const roleConfig: Record<string, { icon: typeof Shield; label: string; className: string }> = {
  admin: { icon: Shield, label: "Admin", className: "bg-energy-red-light text-destructive" },
  gestor: { icon: UserCog, label: "Gestor", className: "bg-energy-blue-light text-energy-blue" },
  operador: { icon: Eye, label: "Operador", className: "bg-muted text-muted-foreground" },
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">{mockUsers.length} usuários cadastrados</p>
        </div>
        <button className="gradient-primary text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
          + Novo Usuário
        </button>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
              <th className="text-left py-3 px-4 font-medium">Usuário</th>
              <th className="text-left py-3 px-4 font-medium">Email</th>
              <th className="text-center py-3 px-4 font-medium">Perfil</th>
              <th className="text-center py-3 px-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => {
              const role = roleConfig[user.role];
              return (
                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="outline" className={`text-[11px] ${role.className}`}>
                      {role.label}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs font-medium ${user.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`}>
                      {user.status === 'active' ? '● Ativo' : '○ Inativo'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
