import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users, Settings, Plug, MapPin, Activity } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import UsersPage from "./UsersPage";
import SettingsPage from "./SettingsPage";
import McpDocPage from "./McpDocPage";
import NomenclaturesPage from "./NomenclaturesPage";
import AuditLogsPanel from "@/components/AuditLogsPanel";

export default function SystemManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "usuarios";
  const [locationCount, setLocationCount] = useState<number>(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("property_locations")
        .select("*", { count: "exact", head: true });
      setLocationCount(count ?? 0);
    };
    fetchCount();
  }, []);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão do Sistema</h1>
        <p className="text-sm text-muted-foreground">Gerenciar usuários, integrações e configurações da plataforma</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2">
            <Settings className="h-4 w-4" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="nomenclaturas" className="gap-2">
            <MapPin className="h-4 w-4" />
            Localidades
            {locationCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
                {locationCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Plug className="h-4 w-4" />
            API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-6">
          <UsersPage embedded />
        </TabsContent>

        <TabsContent value="nomenclaturas" className="mt-6">
          <NomenclaturesPage />
        </TabsContent>

        <TabsContent value="integracoes" className="mt-6">
          <SettingsPage embedded />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <AuditLogsPanel />
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <McpDocPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "usuarios";
  const [locationCount, setLocationCount] = useState<number>(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("property_locations")
        .select("*", { count: "exact", head: true });
      setLocationCount(count ?? 0);
    };
    fetchCount();
  }, []);

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestão do Sistema</h1>
        <p className="text-sm text-muted-foreground">Gerenciar usuários, integrações e configurações da plataforma</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="usuarios" className="gap-2">
            <Users className="h-4 w-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2">
            <Settings className="h-4 w-4" />
            Integrações
          </TabsTrigger>
          <TabsTrigger value="nomenclaturas" className="gap-2">
            <MapPin className="h-4 w-4" />
            Localidades
            {locationCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">
                {locationCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Plug className="h-4 w-4" />
            API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-6">
          <UsersPage embedded />
        </TabsContent>

        <TabsContent value="nomenclaturas" className="mt-6">
          <NomenclaturesPage />
        </TabsContent>

        <TabsContent value="integracoes" className="mt-6">
          <SettingsPage embedded />
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <McpDocPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
