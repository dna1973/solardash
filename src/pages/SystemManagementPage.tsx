import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Settings } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import UsersPage from "./UsersPage";
import SettingsPage from "./SettingsPage";

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
          <TabsTrigger value="integracoes" className="gap-2">
            <Settings className="h-4 w-4" />
            Integrações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-6">
          <UsersPage embedded />
        </TabsContent>

        <TabsContent value="integracoes" className="mt-6">
          <SettingsPage embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
