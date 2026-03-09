import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings, Plug, MapPin } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import UsersPage from "./UsersPage";
import SettingsPage from "./SettingsPage";
import McpDocPage from "./McpDocPage";
import NomenclaturesPage from "./NomenclaturesPage";

export default function SystemManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "usuarios";

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
          <TabsTrigger value="nomenclaturas" className="gap-2">
            <MapPin className="h-4 w-4" />
            Nomenclaturas
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-2">
            <Settings className="h-4 w-4" />
            Integrações
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
