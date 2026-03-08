import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ["user-role", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .limit(1)
        .single();
      if (error) return "operador";
      return data.role;
    },
  });

  return {
    role: role || "operador",
    isAdmin: role === "admin",
    isGestor: role === "gestor" || role === "admin",
    isLoading,
  };
}
