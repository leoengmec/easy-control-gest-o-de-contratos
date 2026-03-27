import { useState, useEffect, useCallback } from "react";
import { Minus, Plus, RotateCcw, Volume2, VolumeX, Contrast, X, Accessibility } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const FONT_SIZES = [14, 16, 18, 20, 22];

const TEMAS = [
  { key: "normal",           label: "Padrão",              bg: "#ffffff", text: "#1a2e4a" },
  { key: "contrast-yellow",  label: "Contraste Amarelo",   bg: "#000000", text: "#ffff00" },
  { key: "contrast-white",   label: "Contraste Branco",    bg: "#000000", text: "#ffffff" },
  { key: "contrast-sepia",   label: "Sépia",               bg: "#f4ecd8", text: "#3b2a1a" },
  { key: "contrast-blue",    label: "Contraste Azul",      bg: "#001a66", text: "#ffffff" },
];

export default function BarraAcessibilidade() {
  const [fontIndex, setFontIndex] = useState(1);
  const [tema, setTema] = useState("normal");
  const [leituraAtiva, setLeituraAtiva] = useState(false);
  const [aberto, setAberto] = useState(false);

  // Fonte
  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SIZES[fontIndex]}px`;
  }, [fontIndex]);

  // Tema / Contraste
  useEffect(() => {
    const t = TEMAS.find(t => t.key === tema);
    if (tema === "normal") {
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    } else {
      document.body.style.backgroundColor = t.bg;
      document.body.style.color = t.text;
    }
  }, [tema]);

  // Leitura por hover
  const handleMouseOver = useCallback((e) => {
    const texto = (e.target.innerText || e.target.textContent || "").trim().replace(/\s+/g, " ").substring(0, 200);
    if (!texto) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }, []);

  useEffect(() => {
    if (leituraAtiva) {
      document.addEventListener("mouseover", handleMouseOver);
    } else {
      window.speechSynthesis.cancel();
      document.removeEventListener("mouseover", handleMouseOver);
    }
    return () => document.removeEventListener("mouseover", handleMouseOver);
  }, [leituraAtiva, handleMouseOver]);

  // VLibras
  useEffect(() => {
    if (document.getElementById("vlibras-plugin")) return;
    const div = document.createElement("div");
    div.setAttribute("vw", "");
    div.className = "enabled";
    div.id = "vlibras-plugin";
    div.innerHTML = `<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>`;
    document.body.appendChild(div);
    const script = document.createElement("script");
    script.src = "https://vlibras.gov.br/app/vlibras-plugin.js";
    script.onload = () => { if (window.VLibras) new window.VLibras.Widget("https://vlibras.gov.br/app"); };
    document.body.appendChild(script);
  }, []);

  const aumentar = () => setFontIndex(i => Math.min(i + 1, FONT_SIZES.length - 1));
  const diminuir = () => setFontIndex(i => Math.max(i - 1, 0));
  const resetar  = () => { setFontIndex(1); setTema("normal"); setLeituraAtiva(false); };

  return (
    <TooltipProvider>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(a => !a)}
        className="fixed bottom-6 right-6 z-[9999] w-12 h-12 rounded-full bg-[#1a2e4a] text-white shadow-2xl flex items-center justify-center hover:bg-[#2a4a7a] transition-colors"
        aria-label="Abrir opções de acessibilidade"
        title="Acessibilidade"
      >
        {aberto ? <X className="w-5 h-5" /> : <Accessibility className="w-5 h-5" />}
      </button>

      {/* Painel */}
      {aberto && (
        <div className="fixed bottom-20 right-6 z-[9998] w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          {/* Cabeçalho */}
          <div className="bg-[#1a2e4a] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Accessibility className="w-4 h-4" />
              <span className="font-semibold text-sm">Acessibilidade</span>
            </div>
            <button
              onClick={resetar}
              className="text-blue-300 hover:text-white text-xs flex items-center gap-1"
              title="Resetar tudo"
            >
              <RotateCcw className="w-3 h-3" /> Resetar
            </button>
          </div>

          <div className="p-4 space-y-5">
            {/* Tamanho da fonte */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tamanho da fonte</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={diminuir}
                  disabled={fontIndex === 0}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition"
                  aria-label="Diminuir fonte"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 flex justify-center gap-1">
                  {FONT_SIZES.map((s, i) => (
                    <button
                      key={s}
                      onClick={() => setFontIndex(i)}
                      className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${fontIndex === i ? "bg-[#1a2e4a] text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      aria-label={`Fonte ${s}px`}
                    >
                      {s === 14 ? "A" : s === 16 ? "A" : s === 18 ? "A" : s === 20 ? "A" : "A"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={aumentar}
                  disabled={fontIndex === FONT_SIZES.length - 1}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40 transition"
                  aria-label="Aumentar fonte"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-center text-xs text-gray-400 mt-1">{FONT_SIZES[fontIndex]}px</p>
            </div>

            {/* Contraste */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Contrast className="w-3 h-3" /> Contraste
              </p>
              <div className="grid grid-cols-5 gap-2">
                {TEMAS.map(t => (
                  <Tooltip key={t.key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setTema(t.key)}
                        className={`h-9 rounded-lg border-2 flex items-center justify-center font-bold text-sm transition-all ${tema === t.key ? "border-blue-500 scale-105 shadow-md" : "border-gray-200 hover:border-gray-400"}`}
                        style={{ backgroundColor: t.bg, color: t.text }}
                        aria-label={t.label}
                        aria-pressed={tema === t.key}
                      >
                        A
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{t.label}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            {/* Leitura por voz */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Leitura por voz</p>
              <button
                onClick={() => setLeituraAtiva(a => !a)}
                className={`w-full h-10 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-medium transition-all ${leituraAtiva ? "bg-[#1a2e4a] text-white border-[#1a2e4a]" : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"}`}
                aria-pressed={leituraAtiva}
              >
                {leituraAtiva ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {leituraAtiva ? "Leitura ativa (passe o mouse)" : "Ativar leitura por hover"}
              </button>
            </div>

            {/* VLibras */}
            <div className="pt-1 border-t border-gray-100 text-xs text-gray-400 text-center">
              🤟 VLibras integrado — use o botão azul na tela
            </div>
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}