import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Server, Key, Wrench, Code2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

const MCP_URL = "https://oonatblrieucuchhqzgq.supabase.co/functions/v1/solar-mcp";

const tools = [
  {
    name: "list_plants",
    description: "Lista todas as usinas solares cadastradas no sistema",
    params: [
      { name: "status", type: "string", optional: true, description: "Filtrar por status: online, offline, warning, maintenance" }
    ]
  },
  {
    name: "get_energy_data",
    description: "Consulta dados detalhados de geração e consumo de energia",
    params: [
      { name: "plant_id", type: "string", optional: true, description: "ID da usina (opcional)" },
      { name: "start_date", type: "string", optional: true, description: "Data inicial (ISO 8601)" },
      { name: "end_date", type: "string", optional: true, description: "Data final (ISO 8601)" },
      { name: "limit", type: "number", optional: true, description: "Limite de registros (padrão: 100)" }
    ]
  },
  {
    name: "get_plant_summary",
    description: "Retorna estatísticas agregadas de uma usina específica",
    params: [
      { name: "plant_id", type: "string", optional: false, description: "ID da usina" },
      { name: "days", type: "number", optional: true, description: "Período em dias (padrão: 30)" }
    ]
  },
  {
    name: "get_daily_generation",
    description: "Agrega dados de geração por dia em um período. Ideal para relatórios mensais",
    params: [
      { name: "plant_id", type: "string", optional: true, description: "ID da usina (opcional, agrega todas se omitido)" },
      { name: "start_date", type: "string", optional: false, description: "Data de início (ex: 2024-01-01)" },
      { name: "end_date", type: "string", optional: false, description: "Data de fim (ex: 2024-01-31)" }
    ]
  },
  {
    name: "get_alerts",
    description: "Recupera alertas ativos ou histórico de alertas",
    params: [
      { name: "plant_id", type: "string", optional: true, description: "Filtrar por usina" },
      { name: "resolved", type: "boolean", optional: true, description: "Filtrar por status de resolução" },
      { name: "limit", type: "number", optional: true, description: "Limite de registros (padrão: 50)" }
    ]
  },
  {
    name: "import_energy_bill",
    description: "Importa uma conta de energia elétrica via arquivo em base64. Processa OCR, extrai dados e salva no banco de dados.",
    params: [
      { name: "file_base64", type: "string", optional: false, description: "Conteúdo do arquivo codificado em base64" },
      { name: "file_name", type: "string", optional: false, description: "Nome do arquivo (ex: conta_energia.pdf)" },
      { name: "file_type", type: "string", optional: false, description: "MIME type (ex: application/pdf, image/jpeg)" },
      { name: "tenant_id", type: "string", optional: true, description: "UUID do tenant (usa default se omitido)" }
    ]
  },
  {
    name: "import_water_bill",
    description: "Importa uma conta de água via arquivo em base64. Processa OCR, extrai dados e salva no banco de dados.",
    params: [
      { name: "file_base64", type: "string", optional: false, description: "Conteúdo do arquivo codificado em base64" },
      { name: "file_name", type: "string", optional: false, description: "Nome do arquivo (ex: conta_agua.pdf)" },
      { name: "file_type", type: "string", optional: false, description: "MIME type (ex: application/pdf, image/jpeg)" },
      { name: "tenant_id", type: "string", optional: true, description: "UUID do tenant (usa default se omitido)" }
    ]
  }
];

const exampleConfig = `{
  "mcpServers": {
    "solar-hub": {
      "url": "${MCP_URL}",
      "transport": {
        "type": "http",
        "headers": {
          "Authorization": "Bearer YOUR_API_KEY"
        }
      }
    }
  }
}`;

const exampleCall = `curl -X POST ${MCP_URL} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_plants",
      "arguments": {}
    },
    "id": 1
  }'`;

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label || (copied ? "Copiado!" : "Copiar")}
    </Button>
  );
}

export default function McpDocPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Servidor MCP</h1>
        <p className="text-muted-foreground mt-1">
          Documentação e configuração do servidor Model Context Protocol (MCP) para integração com clientes externos.
        </p>
      </div>

      {/* URL do Servidor */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Endpoint do Servidor</CardTitle>
            </div>
            <CardDescription>
              URL para conexão de clientes MCP compatíveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-sm font-mono text-foreground break-all">
                {MCP_URL}
              </code>
              <CopyButton text={MCP_URL} />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Badge variant="secondary">HTTP Streamable</Badge>
              <Badge variant="outline">JSON-RPC 2.0</Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Autenticação */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Autenticação</CardTitle>
            </div>
            <CardDescription>
              O servidor requer autenticação via Bearer Token
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-border rounded-lg bg-card">
              <p className="text-sm text-muted-foreground mb-2">Header obrigatório:</p>
              <code className="text-sm font-mono text-foreground">
                Authorization: Bearer YOUR_API_KEY
              </code>
            </div>
            <p className="text-sm text-muted-foreground">
              Substitua <code className="text-foreground bg-muted px-1 rounded">YOUR_API_KEY</code> pela 
              chave de API configurada no ambiente do servidor (variável <code className="text-foreground bg-muted px-1 rounded">LOVABLE_API_KEY</code>).
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Ferramentas Disponíveis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Ferramentas Disponíveis</CardTitle>
            </div>
            <CardDescription>
              Endpoints MCP para consulta de dados do sistema solar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tools.map((tool, index) => (
                <div key={tool.name} className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <code className="text-sm font-semibold text-primary">{tool.name}</code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{tool.description}</p>
                  {tool.params.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground uppercase tracking-wider">Parâmetros</p>
                      <div className="grid gap-2">
                        {tool.params.map((param) => (
                          <div key={param.name} className="flex items-start gap-2 text-sm">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-foreground shrink-0">
                              {param.name}
                            </code>
                            <span className="text-muted-foreground">
                              <span className="text-xs text-muted-foreground/70">({param.type}{param.optional ? ", opcional" : ""})</span>
                              {" — "}{param.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Configuração para Clientes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Configuração para Clientes MCP</CardTitle>
            </div>
            <CardDescription>
              Exemplo de configuração para Claude Desktop, Cursor e outros clientes compatíveis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">mcp_config.json</p>
                <CopyButton text={exampleConfig} label="Copiar JSON" />
              </div>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono text-foreground">
                {exampleConfig}
              </pre>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">Exemplo de chamada (cURL)</p>
                <CopyButton text={exampleCall} label="Copiar cURL" />
              </div>
              <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-xs font-mono text-foreground whitespace-pre-wrap">
                {exampleCall}
              </pre>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Links Úteis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recursos Adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" asChild>
                <a href="https://modelcontextprotocol.io/docs" target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Documentação MCP
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="https://github.com/modelcontextprotocol" target="_blank" rel="noopener noreferrer" className="gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  GitHub MCP
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
