export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          created_at: string
          device_id: string | null
          id: string
          message: string
          plant_id: string
          resolved: boolean
          resolved_at: string | null
          type: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          id?: string
          message: string
          plant_id: string
          resolved?: boolean
          resolved_at?: string | null
          type: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          id?: string
          message?: string
          plant_id?: string
          resolved?: boolean
          resolved_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          api_endpoint: string | null
          auth_token: string | null
          collection_interval_minutes: number
          created_at: string
          device_type: string
          id: string
          last_communication: string | null
          manufacturer: string
          model: string
          plant_id: string
          serial_number: string
          status: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          auth_token?: string | null
          collection_interval_minutes?: number
          created_at?: string
          device_type: string
          id?: string
          last_communication?: string | null
          manufacturer: string
          model: string
          plant_id: string
          serial_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          auth_token?: string | null
          collection_interval_minutes?: number
          created_at?: string
          device_type?: string
          id?: string
          last_communication?: string | null
          manufacturer?: string
          model?: string
          plant_id?: string
          serial_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_bills: {
        Row: {
          account_number: string | null
          address: string | null
          amount_brl: number | null
          client_code: string | null
          consumption_kwh: number | null
          created_at: string
          deductions_value: number | null
          due_date: string | null
          generation_kwh: number | null
          gross_value: number | null
          id: string
          invoice_number: string | null
          invoice_value: number | null
          lighting_cost: number | null
          net_value: number | null
          off_peak_demand_kw: number | null
          pdf_path: string | null
          peak_demand_kw: number | null
          property_name: string | null
          qd: string | null
          raw_ocr_data: Json | null
          reference_month: string | null
          tariff_type: string | null
          tenant_id: string
          updated_at: string
          utility_company: string | null
        }
        Insert: {
          account_number?: string | null
          address?: string | null
          amount_brl?: number | null
          client_code?: string | null
          consumption_kwh?: number | null
          created_at?: string
          deductions_value?: number | null
          due_date?: string | null
          generation_kwh?: number | null
          gross_value?: number | null
          id?: string
          invoice_number?: string | null
          invoice_value?: number | null
          lighting_cost?: number | null
          net_value?: number | null
          off_peak_demand_kw?: number | null
          pdf_path?: string | null
          peak_demand_kw?: number | null
          property_name?: string | null
          qd?: string | null
          raw_ocr_data?: Json | null
          reference_month?: string | null
          tariff_type?: string | null
          tenant_id: string
          updated_at?: string
          utility_company?: string | null
        }
        Update: {
          account_number?: string | null
          address?: string | null
          amount_brl?: number | null
          client_code?: string | null
          consumption_kwh?: number | null
          created_at?: string
          deductions_value?: number | null
          due_date?: string | null
          generation_kwh?: number | null
          gross_value?: number | null
          id?: string
          invoice_number?: string | null
          invoice_value?: number | null
          lighting_cost?: number | null
          net_value?: number | null
          off_peak_demand_kw?: number | null
          pdf_path?: string | null
          peak_demand_kw?: number | null
          property_name?: string | null
          qd?: string | null
          raw_ocr_data?: Json | null
          reference_month?: string | null
          tariff_type?: string | null
          tenant_id?: string
          updated_at?: string
          utility_company?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_bills_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      energy_data: {
        Row: {
          consumption_power_kw: number | null
          created_at: string
          current: number | null
          device_id: string | null
          energy_consumed_kwh: number | null
          energy_generated_kwh: number | null
          generation_power_kw: number | null
          id: string
          plant_id: string
          status: string | null
          temperature: number | null
          timestamp: string
          voltage: number | null
        }
        Insert: {
          consumption_power_kw?: number | null
          created_at?: string
          current?: number | null
          device_id?: string | null
          energy_consumed_kwh?: number | null
          energy_generated_kwh?: number | null
          generation_power_kw?: number | null
          id?: string
          plant_id: string
          status?: string | null
          temperature?: number | null
          timestamp: string
          voltage?: number | null
        }
        Update: {
          consumption_power_kw?: number | null
          created_at?: string
          current?: number | null
          device_id?: string | null
          energy_consumed_kwh?: number | null
          energy_generated_kwh?: number | null
          generation_power_kw?: number | null
          id?: string
          plant_id?: string
          status?: string | null
          temperature?: number | null
          timestamp?: string
          voltage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "energy_data_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "energy_data_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          is_active: boolean
          last_error: string | null
          last_sync_at: string | null
          manufacturer: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          manufacturer: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          manufacturer?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plants: {
        Row: {
          capacity_kwp: number
          created_at: string
          id: string
          installation_date: string | null
          integrator: string | null
          latitude: number | null
          location: string | null
          longitude: number | null
          name: string
          status: string
          tenant_id: string
          updated_at: string
          utility_company: string | null
        }
        Insert: {
          capacity_kwp?: number
          created_at?: string
          id?: string
          installation_date?: string | null
          integrator?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name: string
          status?: string
          tenant_id: string
          updated_at?: string
          utility_company?: string | null
        }
        Update: {
          capacity_kwp?: number
          created_at?: string
          id?: string
          installation_date?: string | null
          integrator?: string | null
          latitude?: number | null
          location?: string | null
          longitude?: number | null
          name?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          utility_company?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      property_locations: {
        Row: {
          account_number: string
          created_at: string
          id: string
          location_name: string
          plant_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_number: string
          created_at?: string
          id?: string
          location_name: string
          plant_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_number?: string
          created_at?: string
          id?: string
          location_name?: string
          plant_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_locations_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_locations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      device_belongs_to_tenant: {
        Args: { _plant_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "operador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gestor", "operador"],
    },
  },
} as const
