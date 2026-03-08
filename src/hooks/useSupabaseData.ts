import { useQuery } from "@tanstack/react-query";
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
