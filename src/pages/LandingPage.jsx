import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import {
  FileText,
  DollarSign,
  BarChart2,
  Shield,
  CheckCircle,
  ArrowRight,
  Clock,
  PiggyBank,
  ShoppingCart,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69a6ff7797ad3d24713a3ae6/c87e67650_Generatedimage_1772671158016.png";

const features = [
  {
    icon: FileText,
    title: "Gestão de Contratos",
    desc: "Cadastre e acompanhe todos os seus contratos com histórico de aditivos, vigências e responsáveis.",
  },
  {
    icon: DollarSign,
    title: "Lançamentos Financeiros",
    desc: "Registre notas fiscais, ordens de serviço e acompanhe os pagamentos por status.",
  },
  {
    icon: PiggyBank,
    title: "Controle Orçamentário",
    desc: "Defina orçamentos anuais, distribua por item e monitore o consumo em tempo real.",
  },
  {
    icon: BarChart2,
    title: "Relatórios e Dashboards",
    desc: "Visualize indicadores consolidados, gráficos de desempenho e exporte relatórios em CSV ou PDF.",
  },
  {
    icon: ShoppingCart,
    title: "Controle de Materiais",
    desc: "Gerencie itens de notas fiscais de materiais com rastreabilidade por OS e local.",
  },
  {
    icon: Bell,
    title: "Alertas Inteligentes",
    desc: "Receba alertas de vencimento de contratos e limites orçamentários configuráveis.",
  },
];

const benefits = [
  "Acesso por perfis: Admin, Gestor, Fiscal e Direção",
  "Histórico completo de aditivos e repactuações",
  "Empenhos vinculados por natureza de despesa",
  "Distribuição orçamentária por item contratual",
  "Exportação de relatórios em PDF e CSV",
  "Interface responsiva para desktop e mobile",
];

export default function LandingPage() {
  const handleLogin = () => {
    base44.auth.redirectToLogin(createPageUrl("Dashboard"));
  };

  return (
    <div className="min-h-screen bg-[#0d1b2e] text-white font-sans">

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-[#0d1b2e]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <span className="text-white font-bold text-sm tracking-wide">Easer Control</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-200 hover:text-white hover:bg-white/10 text-sm"
              onClick={handleLogin}
            >
              Entrar
            </Button>
            <Button
              size="sm"
              className="bg-blue-500 hover:bg-blue-400 text-white text-sm px-4"
              onClick={handleLogin}
            >
              Começar <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-28 pb-16 px-4 sm:px-6 text-center relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          <img
            src={LOGO_URL}
            alt="Easer Control"
            className="h-40 mx-auto mb-8 object-contain drop-shadow-lg"
          />
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-5">
            Gestão de Contratos{" "}
            <span className="text-blue-400">inteligente e eficiente</span>
          </h1>
          <p className="text-blue-200/80 text-base md:text-xl mb-8 max-w-2xl mx-auto">
            Centralize o controle de contratos, lançamentos financeiros, orçamentos e relatórios em uma única plataforma segura e fácil de usar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-blue-500 hover:bg-blue-400 text-white text-base px-8"
              onClick={handleLogin}
            >
              Acessar o sistema <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-blue-400 text-blue-300 hover:bg-blue-400/10 hover:text-white text-base px-8"
              onClick={() => document.getElementById("features").scrollIntoView({ behavior: "smooth" })}
            >
              Conhecer funcionalidades
            </Button>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-10 px-4 sm:px-6 border-y border-white/10 bg-white/5">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "100%", label: "Web e Mobile" },
            { value: "4", label: "Perfis de acesso" },
            { value: "6+", label: "Módulos integrados" },
            { value: "v1.0", label: "Versão atual" },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-3xl font-bold text-blue-400">{s.value}</div>
              <div className="text-blue-200/70 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold mb-3">Tudo que você precisa para gerir contratos</h2>
            <p className="text-blue-200/70 max-w-xl mx-auto">
              Do cadastro do contrato ao controle financeiro detalhado, o Easer Control cobre todo o ciclo de vida contratual.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-blue-400/30 transition-all duration-200"
              >
                <div className="w-11 h-11 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-blue-200/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-16 px-4 sm:px-6 bg-white/5 border-y border-white/10">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">Por que usar o Easer Control?</h2>
            <p className="text-blue-200/70 mb-8">
              Desenvolvido para atender às necessidades reais de fiscais, gestores e administradores na gestão de contratos públicos e privados.
            </p>
            <ul className="space-y-3">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-blue-100">
                  <CheckCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#0d1b2e] border border-white/10 rounded-2xl p-8 space-y-4">
            {[
              { icon: Shield, label: "Controle de acesso por perfil", color: "text-blue-400" },
              { icon: Clock, label: "Alertas de vencimento automáticos", color: "text-yellow-400" },
              { icon: BarChart2, label: "Dashboards em tempo real", color: "text-green-400" },
              { icon: FileText, label: "Geração de relatórios completos", color: "text-purple-400" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 bg-white/5 rounded-lg px-4 py-3">
                <item.icon className={`w-5 h-5 ${item.color}`} />
                <span className="text-sm text-blue-100">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-blue-200/70 mb-8">
            Acesse o sistema agora e tenha controle total sobre os seus contratos.
          </p>
          <Button
            size="lg"
            className="bg-blue-500 hover:bg-blue-400 text-white text-base px-10 py-6"
            onClick={handleLogin}
          >
            Acessar o Easer Control <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-8 px-6 text-center text-blue-300/50 text-xs">
        <img src={LOGO_URL} alt="Easer Control" className="h-8 mx-auto mb-4 object-contain opacity-50" />
        <p>© {new Date().getFullYear()} Easer Control — Gestão de Contratos</p>
        <p className="mt-1">Desenvolvido por <span className="text-blue-300/80">Leonardo Alves</span> · v1.0.0</p>
      </footer>
    </div>
  );
}