import { useState, useEffect, useCallback } from "react";
import { Type, Sun, Eye, Mic, MicOff, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TEMAS = [
  { key: "normal", label: "Normal", style: {} },
  { key: "contrast-yellow", label: "Alto Contraste Amarelo", bg: "#000", text: "#ffff00", style: { backgroundColor: "#000000", color: "#ffff00", filter: "none" } },
  { key: "contrast-white", label: "Alto Contraste Branco", bg: "#000", text: "#fff", style: { backgroundColor: "#000000", color: "#ffffff", filter: "none" } },
  { key: "contrast-sepia", label: "Sépia", bg: "#f4ecd8", text: "#3b2a1a", style: { backgroundColor: "#f4ecd8", color: "#3b2a1a", filter: "sepia(60%)" } },
  { key: "contrast-blue", label: "Alto Contraste Azul", bg: "#00008b", text: "#fff", style: { backgroundColor: "#00008b", color: "#ffffff", filter: "none" } },
];

const FONT_SIZES = [14, 16, 18, 20, 22];

export default function BarraAcessibilidade() {
  const [fontIndex, setFontIndex] = useState(1); // 16px padrão
  const [tema, setTema] = useState("normal");
  const [leituraAtiva, setLeituraAtiva] = useState(false);
  const [aberta, setAberta] = useState(false);

  // Aplica tamanho de fonte
  useEffect(() => {
    document.documentElement.style.fontSize = `${FONT_SIZES[fontIndex]}px`;
  }, [fontIndex]);

  // Aplica tema de contraste
  useEffect(() => {
    const temaObj = TEMAS.find(t => t.key === tema);
    if (!temaObj) return;
    const root = document.documentElement;
    if (tema === "normal") {
      root.removeAttribute("data-tema");
      root.style.filter = "";
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    } else {
      root.setAttribute("data-tema", tema);
      root.style.filter = temaObj.style.filter || "";
      document.body.style.backgroundColor = temaObj.style.backgroundColor || "";
      document.body.style.color = temaObj.style.color || "";
    }
    return () => {
      root.removeAttribute("data-tema");
      root.style.filter = "";
    };
  }, [tema]);

  // Hover-to-speak
  const handleMouseOver = useCallback((e) => {
    if (!leituraAtiva) return;
    const el = e.target;
    const texto = el.innerText || el.textContent || el.getAttribute("aria-label") || el.getAttribute("title") || "";
    const limpo = texto.trim().replace(/\s+/g, " ").substring(0, 200);
    if (!limpo) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(limpo);
    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
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

  // Injeta VLibras
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

  const aumentarFonte = () => setFontIndex(i => Math.min(i + 1, FONT_SIZES.length - 1));
  const diminuirFonte = () => setFontIndex(i => Math.max(i - 1, 0));
  const resetarFonte = () => setFontIndex(1);

  return (
    <TooltipProvider>
      <div className="fixed top-0 right-0 z-[9999] flex items-center gap-1 bg-[#1a2e4a] text-white px-2 py-1 rounded-bl-lg shadow-lg text-xs">
        {/* Toggle expand */}
        <button
          onClick={() => setAberta(a => !a)}
          className="text-blue-300 hover:text-white px-1 py-0.5 font-semibold tracking-wide"
          aria-label="Acessibilidade"
          title="Opções de Acessibilidade"
        >
          ♿ {aberta ? "▲" : "▼"}
        </button>

        {aberta && (
          <>
            {/* Fonte */}
            <div className="flex items-center gap-0.5 border-l border-white/20 pl-2 ml-1">
              <Tooltip><TooltipTrigger asChild>
                <button onClick={diminuirFonte} className="p-1 hover:bg-white/20 rounded" aria-label="Diminuir fonte"><ZoomOut className="w-3.5 h-3.5" /></button>
              </TooltipTrigger><TooltipContent>Diminuir fonte</TooltipContent></Tooltip>

              <span className="px-1 text-blue-200">{FONT_SIZES[fontIndex]}px</span>

              <Tooltip><TooltipTrigger asChild>
                <button onClick={aumentarFonte} className="p-1 hover:bg-white/20 rounded" aria-label="Aumentar fonte"><ZoomIn className="w-3.5 h-3.5" /></button>
              </TooltipTrigger><TooltipContent>Aumentar fonte</TooltipContent></Tooltip>

              <Tooltip><TooltipTrigger asChild>
                <button onClick={resetarFonte} className="p-1 hover:bg-white/20 rounded" aria-label="Resetar fonte"><RotateCcw className="w-3 h-3" /></button>
              </TooltipTrigger><TooltipContent>Tamanho padrão</TooltipContent></Tooltip>
            </div>

            {/* Contraste */}
            <div className="flex items-center gap-0.5 border-l border-white/20 pl-2 ml-1">
              {TEMAS.map(t => (
                <Tooltip key={t.key}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setTema(t.key)}
                      className={`w-5 h-5 rounded-sm border-2 transition-all ${tema === t.key ? "border-yellow-400 scale-110" : "border-transparent"}`}
                      style={{
                        backgroundColor: t.key === "normal" ? "#fff" : t.style.backgroundColor,
                        color: t.key === "normal" ? "#000" : t.style.color,
                      }}
                      aria-label={t.label}
                    >
                      {t.key === "normal" ? <span className="text-[8px] font-bold text-gray-800">A</span> : <span className="text-[8px] font-bold" style={{ color: t.style.color }}>A</span>}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Leitura por voz */}
            <div className="border-l border-white/20 pl-2 ml-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setLeituraAtiva(a => !a)}
                    className={`p-1 rounded flex items-center gap-1 ${leituraAtiva ? "bg-yellow-400 text-black" : "hover:bg-white/20"}`}
                    aria-label={leituraAtiva ? "Desativar leitura por voz" : "Ativar leitura por voz"}
                  >
                    {leituraAtiva ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{leituraAtiva ? "Voz ON" : "Voz"}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{leituraAtiva ? "Desativar leitura por hover" : "Ativar leitura por hover (passe o mouse sobre o texto)"}</TooltipContent>
              </Tooltip>
            </div>

            {/* VLibras info */}
            <div className="border-l border-white/20 pl-2 ml-1 text-blue-300 text-[10px] hidden sm:block">
              🤟 VLibras ativo
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}