import React, { useState } from "react";
import {
  Wind,
  Waves,
  CloudRain,
  Thermometer,
  ExternalLink,
  Maximize2,
  Minimize2,
  Compass,
  Ship,
  Gauge
} from "lucide-react";
import { WeatherDataParsed } from "../services/weatherService";

interface WeatherWidgetProps {
  weatherData?: WeatherDataParsed | null;
  fullPage?: boolean;
}

type WindyOverlay = "wind" | "gust" | "waves" | "radar" | "temp";

export function WeatherWidget({ weatherData, fullPage = false }: WeatherWidgetProps) {
  const [activeOverlay, setActiveOverlay] = useState<WindyOverlay>("wind");
  const [isExpanded, setIsExpanded] = useState<boolean>(fullPage);

  // Coordinate di riferimento: Imperia / Mar Ligure
  const lat = 43.88;
  const lon = 8.02;
  const zoom = 9;

  // URL per l'embed interattivo di Windy
  const windyEmbedUrl = `https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=kt&zoom=${zoom}&overlay=${activeOverlay}&product=ecmwf&level=surface&lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&marker=true&message=true`;

  // URL per aprire direttamente Windy.com per Imperia
  const windyDirectUrl = `https://www.windy.com/${lat}/${lon}?${lat},${lon},${zoom},m:eNzagjA`;

  const layers: { id: WindyOverlay; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "wind", label: "Vento (kt)", icon: <Wind size={16} />, color: "text-sky-400" },
    { id: "gust", label: "Raffiche", icon: <Gauge size={16} />, color: "text-amber-400" },
    { id: "waves", label: "Onde & Mare", icon: <Waves size={16} />, color: "text-cyan-400" },
    { id: "radar", label: "Radar Pioggia", icon: <CloudRain size={16} />, color: "text-emerald-400" },
    { id: "temp", label: "Temperatura", icon: <Thermometer size={16} />, color: "text-rose-400" },
  ];

  return (
    <div className={`bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 ${isExpanded ? "ring-2 ring-blue-500 shadow-2xl" : ""}`}>
      {/* Header Principale */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/90 rounded-xl text-white shadow-md flex items-center justify-center">
            <Compass size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                Meteo & Vento Marino — Imperia
              </h3>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-red-600 text-white rounded-md tracking-wider flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                Live Windy
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Coordinate: 43.88°N, 8.02°E (Porto Maurizio)</span>
              <span>•</span>
              <span>Modello ECMWF 9km</span>
              <span>•</span>
              <span className="text-sky-300 font-semibold">Unità: Nodi (kt)</span>
            </p>
          </div>
        </div>

        {/* Azioni rapide a destra */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
            title={isExpanded ? "Riduci altezza" : "Espandi mappa"}
          >
            {isExpanded ? (
              <>
                <Minimize2 size={14} /> <span>Compatta</span>
              </>
            ) : (
              <>
                <Maximize2 size={14} /> <span>Espandi</span>
              </>
            )}
          </button>

          <a
            href={windyDirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-all shadow-sm hover:shadow-blue-500/25"
          >
            <span>Apri su Windy.com</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Barra di Selezione Layer Meteo */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">
            Livello Mappa:
          </span>
          {layers.map((l) => {
            const isActive = activeOverlay === l.id;
            return (
              <button
                key={l.id}
                onClick={() => setActiveOverlay(l.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm ring-1 ring-slate-900"
                    : "bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200"
                }`}
              >
                <span className={isActive ? "text-blue-400" : l.color}>{l.icon}</span>
                <span>{l.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] text-slate-500 font-medium hidden lg:flex items-center gap-1">
          <Ship size={14} className="text-blue-600" />
          <span>Ottimizzato per uscite in barca & regate</span>
        </div>
      </div>

      {/* Mappa Interattiva Windy */}
      <div className="relative w-full bg-slate-950">
        <iframe
          key={activeOverlay}
          title="Windy Weather Map Imperia"
          src={windyEmbedUrl}
          className={`w-full border-0 transition-all duration-300 ${
            fullPage || isExpanded
              ? "h-[calc(100vh-210px)] min-h-[650px]"
              : "h-[450px] sm:h-[520px]"
          }`}
          loading="lazy"
          allowFullScreen
        />
      </div>

      {/* Footer / Info Bar */}
      <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          <span>Animazione particelle in tempo reale • Clicca sulla mappa o usa la rotella del mouse per zoomare</span>
        </div>
        <div className="text-slate-400 hidden sm:block">
          Powered by <strong className="text-slate-600">Windy.com</strong>
        </div>
      </div>
    </div>
  );
}
