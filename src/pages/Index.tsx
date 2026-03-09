import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    title: "Monitoramento em tempo real",
    description: "Acompanhe geração, consumo e status dos dispositivos em um único painel.",
  },
  {
    title: "Alertas inteligentes",
    description: "Receba notificações de anomalias e quedas de desempenho automaticamente.",
  },
  {
    title: "Relatórios prontos",
    description: "Visualize indicadores diários e mensais para decisões mais rápidas.",
  },
];

const Index = () => {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border">
        <div className="container mx-auto px-6 py-20 md:py-28">
          <div className="max-w-3xl space-y-6">
            <p className="text-sm font-medium text-muted-foreground">SolarHub</p>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Gestão solar moderna para operações de alta performance
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Centralize plantas, dispositivos e consumo com visibilidade total da sua operação energética.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg">
                <Link to="/login">Entrar na plataforma</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/dashboard">Acessar dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-16 md:py-24" aria-label="Funcionalidades">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="h-full">
              <CardHeader>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Index;
