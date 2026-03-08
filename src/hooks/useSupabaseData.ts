import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePlants() {
  return useQuery({
    queryKey: ["plants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plants")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*, plants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*, plants(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function usePlantById(id: string) {
  return useQuery({
    queryKey: ["plant", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plants")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useDevicesByPlant(plantId: string) {
  return useQuery({
    queryKey: ["devices", "plant", plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("plant_id", plantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!plantId,
  });
}

export function useAlertsByPlant(plantId: string) {
  return useQuery({
    queryKey: ["alerts", "plant", plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("plant_id", plantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!plantId,
  });
}

export function useEnergyData(plantId?: string) {
  return useQuery({
    queryKey: ["energy_data", plantId],
    queryFn: async () => {
      let query = supabase
        .from("energy_data")
        .select("*")
        .order("timestamp", { ascending: true })
        .limit(500);

      if (plantId) {
        query = query.eq("plant_id", plantId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdatePlant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      location?: string;
      utility_company?: string;
      latitude?: number | null;
      longitude?: number | null;
    }) => {
      const { error } = await supabase.from("plants").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["plant", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["plants"] });
    },
  });
}
