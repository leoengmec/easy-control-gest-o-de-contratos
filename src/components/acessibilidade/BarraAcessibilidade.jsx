import { useState, useEffect, useCallback } from "react";
import { Minus, Plus, RotateCcw, Volume2, VolumeX, X, Accessibility } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

const FONT_SIZES = [14, 16, 18, 20, 22];

const TEMAS = [
  { key: "normal",         label: "Padrão",           bg: "#ffffff", text: "#1a2e4a", sidebar: "#1a2e4a" },
  { key: "contrast-yellow",  label: "Contraste Amarelo",    bg: "#000000", text: "#ffff00", sidebar: "#000000" },
  { key: "contrast-white",   label: "Contraste Branco",     bg: "#000000", text: "#ffffff", sidebar: "#000000" },
  { key: "contrast-sepia",   label: "Sépia",                bg: "#f4ecd8", text: "#3b2a1a", sidebar: "#3b2a1a" },
  { key: "contrast-blue",    label: "Contraste Azul",       bg: "#001a66", text: "#ffffff", sidebar: "#000a22" },
];

export default function BarraAcessibilidade() {
  const [fontIndex, setFontIndex] = useState(1);
  const [tema, setTema] = useState("normal");
  const [leituraAtiva, setLeituraAtiva] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SIZES[fontIndex]}px`;
  }, [fontIndex]);

  useEffect(() => {
    const t = TEMAS.find(item => item.key === tema);
    const root = document.documentElement;

    if (tema === "normal") {
      root.style.removeProperty("--bg-primary");
      root.style.removeProperty("--text-primary");
      root.style.removeProperty("--bg-sidebar");
    } else {
      root.style.setProperty("--bg-primary", t.bg);
      root.style.setProperty("--text-primary", t.text);
      root.style.setProperty("--bg-sidebar", t.sidebar);
    }
  }, [tema]);

  const handleMouseOver = useCallback((e) => {
    const target = e.target;
    const texto = (target.innerText || target.textContent || "").trim().substring(0, 200);
    if (!texto || !leituraAtiva) return;
    
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    u.rate = 1;
    window.speechSynthesis.speak(u);
  }, [leituraAtiva]);

  useEffect(() => {
    if (leituraAtiva) {
      document.addEventListener("mouseover", handleMouseOver);
    } else {
      window.speechSynthesis.cancel();
      document.removeEventListener("mouseover", handleMouseOver);
    }
    return () => document.removeEventListener("mouseover", handleMouseOver);
  }, [leituraAtiva, handleMouseOver]);

  useEffect(() => {
    if (document.getElementById("vlibras-plugin")) return;
    const script = document.createElement("script");
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    script.onload = () => { if (window.VLibras) new window.VLibras.Widget("https://vlibras.gov.br/app"); };
    document.body.appendChild(script);
  }, []);

  const resetar = () => { setFontIndex(1); setTema("normal"); setLeituraAtiva(false); };

  return (
    <TooltipProvider>
      <button
        onClick={() => setAberto(a => !a)}
        style={{ backgroundColor: 'var(--bg-sidebar, #1a2e4a)', color: '#ffffff' }}
        className="fixed bottom-6 right-6 z-[10000] w-12 h-12 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all border border-white/20"
      >
        {aberto ? <X /> : <Accessibility />}
      </button>

      {aberto && (
        <div 
          className="fixed bottom-20 right-6 z-[10000] w-72 rounded-2xl shadow-2xl border overflow-hidden"
          style={{ 
            backgroundColor: 'var(--bg-primary, #ffffff)', 
            color: 'var(--text-primary, #1a2e4a)',
            borderColor: 'var(--text-primary, #1a2e4a)' 
          }}
        >
          {/* Cabeçalho Sólido */}
          <div 
            style={{ backgroundColor: 'var(--text-primary, #1a2e4a)', color: 'var(--bg-primary, #ffffff)' }}
            className="px-4 py-3 flex items-center justify-between"
          >
            <span className="font-semibold text-sm">Acessibilidade</span>
            <button onClick={resetar} className="text-xs flex items-center gap-1 opacity-90 hover:opacity-100">
              <RotateCcw className="w-3 h-3" /> Resetar
            </button>
          </div>

          <div className="p-4 space-y-6">
            <div>
              <p className="text-[10px] font-bold opacity-70 uppercase mb-3">Tamanho da Fonte</p>
              <div className="flex justify-between items-center p-2 rounded-lg border border-current">
                <button onClick={() => setFontIndex(Math.max(0, fontIndex - 1))} className="p-1 hover:bg-black/5 rounded"><Minus size={16}/></button>
                <span className="font-bold text-sm">{FONT_SIZES[fontIndex]}px</span>
                <button onClick={() => setFontIndex(Math.min(FONT_SIZES.length - 1, fontIndex + 1))} className="p-1 hover:bg-black/5 rounded"><Plus size={16}/></button>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold opacity-70 uppercase mb-3">Cores e Contraste</p>
              <div className="flex flex-wrap gap-2 justify-between">
                {TEMAS.map(t => (
                  <button
                    key={t.key}
                    onClick={() => setTema(t.key)}
                    title={t.label}
                    style={{ backgroundColor: t.bg, color: t.text, borderColor: t.key === tema ? 'var(--text-primary)' : '#ccc' }}
                    className={`h-10 w-10 rounded-md border-2 flex items-center justify-center font-bold transition-all ${tema === t.key ? 'scale-110' : 'opacity-90'}`}
                  >
                    A
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setLeituraAtiva(!leituraAtiva)}
              style={{ backgroundColor: leituraAtiva ? 'var(--text-primary)' : 'transparent', color: leituraAtiva ? 'var(--bg-primary)' : 'inherit', borderColor: 'currentColor' }}
              className="w-full py-2 rounded-lg border-2 flex items-center justify-center gap-2 text-sm font-medium transition-all"
            >
              {leituraAtiva ? <Volume2 size={18} /> : <VolumeX size={18} />}
              {leituraAtiva ? "Voz Ativa" : "Ativar Voz"}
            </button>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}