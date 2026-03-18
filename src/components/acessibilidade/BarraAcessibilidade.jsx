import { useState, useEffect, useCallback } from "react";
import { Minus, Plus, RotateCcw, Volume2, VolumeX, X, Accessibility } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

const FONT_SIZES = [14, 16, 18, 20, 22];
const TEMAS = [
  { key: "normal", bg: "#ffffff", text: "#1a2e4a", sidebar: "#1a2e4a" },
  { key: "contrast-yellow", bg: "#000000", text: "#ffff00", sidebar: "#000000" },
  { key: "contrast-white", bg: "#000000", text: "#ffffff", sidebar: "#000000" },
  { key: "contrast-sepia", bg: "#f4ecd8", text: "#3b2a1a", sidebar: "#3b2a1a" },
  { key: "contrast-blue", bg: "#001a66", text: "#ffffff", sidebar: "#000a22" },
];

export default function BarraAcessibilidade() {
  const [fontIndex, setFontIndex] = useState(() => Number(localStorage.getItem("ec-font")) || 1);
  const [tema, setTema] = useState(() => localStorage.getItem("ec-tema") || "normal");
  const [leituraAtiva, setLeituraAtiva] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SIZES[fontIndex]}px`;
    localStorage.setItem("ec-font", fontIndex);
  }, [fontIndex]);

  useEffect(() => {
    const t = TEMAS.find(item => item.key === tema);
    const root = document.documentElement;
    localStorage.setItem("ec-tema", tema);

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
    if (!leituraAtiva) return;
    const texto = (e.target.innerText || "").trim().substring(0, 200);
    if (!texto) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    window.speechSynthesis.speak(u);
  }, [leituraAtiva]);

  useEffect(() => {
    if (leituraAtiva) document.addEventListener("mouseover", handleMouseOver);
    else { window.speechSynthesis.cancel(); document.removeEventListener("mouseover", handleMouseOver); }
    return () => document.removeEventListener("mouseover", handleMouseOver);
  }, [leituraAtiva, handleMouseOver]);

  const resetar = () => { 
    setFontIndex(1); setTema("normal"); setLeituraAtiva(false);
    localStorage.clear();
  };

  return (
    <TooltipProvider>
      <button onClick={() => setAberto(!aberto)} 
              style={{ backgroundColor: 'var(--bg-sidebar, #1a2e4a)', color: '#fff' }}
              className="fixed bottom-6 right-6 z-[10000] w-12 h-12 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all border border-white/20">
        {aberto ? <X /> : <Accessibility />}
      </button>

      {aberto && (
        <div className="fixed bottom-20 right-6 z-[10000] w-72 rounded-2xl shadow-2xl border overflow-hidden flex flex-col"
             style={{ backgroundColor: 'var(--bg-primary, #fff)', color: 'var(--text-primary, #1a2e4a)', borderColor: 'var(--text-primary)' }}>
          <div style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }} className="px-4 py-3 flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-tighter">Acessibilidade</span>
            <button onClick={resetar} className="text-[10px] flex items-center gap-1 opacity-80 hover:opacity-100"><RotateCcw size={10}/> Resetar</button>
          </div>
          <div className="p-4 space-y-6">
            <div>
              <p className="text-[10px] font-bold opacity-50 uppercase mb-2">Fonte</p>
              <div className="flex justify-between items-center p-2 rounded-lg border border-current">
                <button onClick={() => setFontIndex(Math.max(0, fontIndex - 1))}><Minus size={14}/></button>
                <span className="font-bold text-xs">{FONT_SIZES[fontIndex]}px</span>
                <button onClick={() => setFontIndex(Math.min(FONT_SIZES.length - 1, fontIndex + 1))}><Plus size={14}/></button>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold opacity-50 uppercase mb-2">Contraste</p>
              <div className="flex justify-between gap-1">
                {TEMAS.map(t => (
                  <button key={t.key} onClick={() => setTema(t.key)}
                          style={{ backgroundColor: t.bg, color: t.text, borderColor: t.key === tema ? 'var(--text-primary)' : 'rgba(128,128,128,0.2)' }}
                          className="h-9 w-9 rounded border-2 flex items-center justify-center text-xs font-bold transition-transform active:scale-95">A</button>
                ))}
              </div>
            </div>
            <button onClick={() => setLeituraAtiva(!leituraAtiva)}
                    style={{ backgroundColor: leituraAtiva ? 'var(--text-primary)' : 'transparent', color: leituraAtiva ? 'var(--bg-primary)' : 'inherit', borderColor: 'currentColor' }}
                    className="w-full py-2 rounded-lg border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all">
              {leituraAtiva ? <Volume2 size={14}/> : <VolumeX size={14}/>} {leituraAtiva ? "Voz Ativa" : "Ativar Voz"}
            </button>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}