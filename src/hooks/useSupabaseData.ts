import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from "date-fns";

export function usePlants() {
  return useQuery({
    queryKey: ["plants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plants")
        .select("*, devices(manufacturer)")
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

export type EnergyPeriod = "today" | "yesterday" | "week" | "month" | "year" | "custom";

export function getDateRange(period: EnergyPeriod, customDate?: Date): { from: string; to: string } {
  const now = customDate || new Date();
  switch (period) {
    case "today":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    case "yesterday": {
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday).toISOString(), to: endOfDay(yesterday).toISOString() };
    }
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(), to: endOfDay(now).toISOString() };
    case "month":
      return { from: startOfMonth(now).toISOString(), to: endOfDay(now).toISOString() };
    case "year":
      return { from: startOfYear(now).toISOString(), to: endOfDay(now).toISOString() };
    case "custom":
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
    default:
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
  }
}

export function useEnergyData(plantId?: string, period: EnergyPeriod = "today", customDate?: Date) {
  const { from, to } = getDateRange(period, customDate);

  return useQuery({
    queryKey: ["energy_data", plantId, period, from, to],
    queryFn: async () => {
      const PAGE_SIZE = 1000;
      let allData: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("energy_data")
          .select("*")
          .gte("timestamp", from)
          .lte("timestamp", to)
          .order("timestamp", { ascending: true })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (plantId) {
          query = query.eq("plant_id", plantId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = data || [];
        allData = allData.concat(rows);
        hasMore = rows.length === PAGE_SIZE;
        page++;
      }

      return allData;
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
      integrator?: string;
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
