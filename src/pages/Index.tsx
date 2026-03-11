import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Bell, FileText, Zap, Shield, ArrowRight, Droplets, MapPin, ScanLine, Download, Gauge, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import LoginDialog from "@/components/LoginDialog";

const features = [
  {
    icon: BarChart3,
    title: "Monitoramento em tempo real",
    description:
      "Acompanhe geração, consumo e status dos dispositivos em um único painel intuitivo.",
  },
  {
    icon: Bell,
    title: "Alertas inteligentes",
    description:
      "Receba notificações automáticas de anomalias e quedas de desempenho antes que virem problemas.",
  },
  {
    icon: ScanLine,
    title: "OCR de faturas",
    description:
      "Importe faturas de energia e água em PDF e extraia dados automaticamente via inteligência artificial.",
  },
  {
    icon: Droplets,
    title: "Gestão de água",
    description:
      "Controle contas de água com consumo em m³, rateio de esgoto e histórico por localidade.",
  },
  {
    icon: MapPin,
    title: "Cadastro de localidades",
    description:
      "Associe códigos de cliente e matrículas de água a localidades e usinas em uma única tabela.",
  },
  {
    icon: Zap,
    title: "Integração com inversores",
    description:
      "Conecte Fronius, Growatt, Hoymiles, APSystems e SolarEdge em minutos.",
  },
  {
    icon: Download,
    title: "Exportação PDF e Excel",
    description:
      "Exporte relatórios de energia e água em PDF ou Excel com filtros por período e localidade.",
  },
  {
    icon: Shield,
    title: "Multi-tenant seguro",
    description:
      "Isolamento total de dados por organização com controle de acesso baseado em papéis.",
  },
  {
    icon: Sun,
    title: "Análise de performance",
    description:
      "Compare geração esperada vs. real e identifique oportunidades de otimização.",
  },
];

const stats = [
  { value: "99.9%", label: "Disponibilidade" },
  { value: "< 5min", label: "Intervalo de coleta" },
  { value: "5+", label: "Fabricantes suportados" },
  { value: "2", label: "Tipos de fatura (OCR)" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const },
  }),
};

const Index = () => {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <main className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      {/* Nav */}
      <header className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Gauge className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Utili<span className="text-primary">Hub</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLoginOpen(true)}>
              Entrar
            </Button>
            <Button size="sm" onClick={() => setLoginOpen(true)}>
              Começar agora
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 pt-20 pb-24 md:pt-32 md:pb-36">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
            >
              <Gauge className="w-3.5 h-3.5" />
              Gestão inteligente de utilidades
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl leading-[1.08]"
            >
              Energia e água{" "}
              <span className="text-primary">sob controle total</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed"
            >
              Centralize usinas solares, contas de energia e água com
              monitoramento em tempo real, importação de faturas por OCR,
              alertas automáticos e relatórios prontos para decisão.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-4 pt-2"
            >
              <Button size="lg" className="gap-2 text-base px-8" onClick={() => setLoginOpen(true)}>
                  Acessar plataforma
                  <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-20 grid grid-cols-2 sm:grid-cols-4 max-w-xl gap-8"
          >
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section
        className="relative z-10 py-20 md:py-28 border-t border-border/50"
        aria-label="Funcionalidades"
      >
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center mb-16"
          >
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-sm font-semibold text-primary uppercase tracking-wider mb-3"
            >
              Funcionalidades
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl md:text-4xl font-bold tracking-tight"
            >
              Tudo que você precisa para operar
            </motion.h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((feature, i) => (
              <motion.div key={feature.title} variants={fadeUp} custom={i + 2}>
                <Card className="h-full border-border/50 hover:border-primary/30 transition-colors group">
                  <CardContent className="pt-6 pb-6 space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 md:py-28 border-t border-border/50">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Pronto para otimizar sua operação?
            </h2>
            <p className="text-muted-foreground text-lg">
              Comece a monitorar usinas e faturas em minutos. Sem instalação complexa.
            </p>
            <Button size="lg" className="gap-2 text-base px-8" onClick={() => setLoginOpen(true)}>
                Começar agora
                <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">UtiliHub</span>
          </div>
          <p>© {new Date().getFullYear()} UtiliHub. Todos os direitos reservados.</p>
        </div>
      </footer>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </main>
  );
};

export default Index;
