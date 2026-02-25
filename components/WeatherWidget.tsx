import React from "react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { WeatherDataParsed, getWeatherEmoji, getWindDirection } from "../services/weatherService";

interface WeatherWidgetProps {
    weatherData: WeatherDataParsed | null;
}

export function WeatherWidget({ weatherData }: WeatherWidgetProps) {
    if (!weatherData) return null;

    const current = weatherData.current;
    const dailyEntries = Array.from(weatherData.daily.values());

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mt-4">
            {/* Intestazione */}
            <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 flex items-center justify-between text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">🌤️ Meteo Imperia</h3>
                <p className="text-xs text-sky-100 font-medium">Coordinate: 43.88°N, 8.02°E</p>
            </div>

            <div className="flex flex-col xl:flex-row bg-slate-50">
                {/* Colonna Sinistra: Situazione Attuale */}
                {current && (
                    <div className="p-4 border-b xl:border-b-0 xl:border-r border-slate-200 flex flex-col items-center justify-center shrink-0 xl:w-72 gap-3 bg-white">
                        <span className="text-5xl drop-shadow-sm">{getWeatherEmoji(current.weatherCode)}</span>
                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Adesso</p>
                            <p className="text-3xl font-bold text-slate-800">{current.temp}°C</p>
                            <p className="text-lg font-bold text-sky-700 mt-2 bg-sky-50 px-3 py-1 rounded-full border border-sky-100 shadow-sm">
                                {current.windSpeedKnots} <span className="text-sm">kt</span> <span className="text-slate-500 text-sm ml-1">({getWindDirection(current.windDirection)})</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Colonna Destra: Lista Previsioni Giornaliere */}
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="px-3 py-1.5 bg-slate-100/50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-center">
                        Previsioni 7 Giorni
                    </div>
                    {/* Horizontal scroll on mobile, flex row on desktop */}
                    <div className="flex flex-row overflow-x-auto divide-x divide-slate-200 flex-1">
                        {dailyEntries.map((day) => {
                            const dateObj = parseISO(day.date);
                            const dayName = format(dateObj, "EEE dd", { locale: it });

                            return (
                                <div key={day.date} className="flex flex-col items-center justify-between px-2 py-3 hover:bg-slate-100/50 transition-colors bg-white min-w-[90px] flex-1">
                                    <span className="text-slate-700 font-semibold text-xs capitalize truncate mb-2">{dayName}</span>
                                    <span className="text-3xl drop-shadow-sm mb-2" title={`Codice Meteo: ${day.weatherCode}`}>{getWeatherEmoji(day.weatherCode)}</span>

                                    <div className="flex flex-col items-center gap-0.5 mb-2 bg-slate-50 px-2 py-1 rounded w-full">
                                        <span className="text-sm font-bold text-slate-800">{day.tempMax}°</span>
                                        <span className="text-xs text-slate-400">{day.tempMin}°</span>
                                    </div>

                                    <div className="flex flex-col items-center justify-center bg-sky-50 w-full rounded py-1 border border-sky-100/50">
                                        <span className="text-sm font-bold text-sky-700">{day.windSpeedMaxKnots} kt</span>
                                        <span className="text-[9px] font-semibold text-sky-600/70">{getWindDirection(day.windDirectionDominant)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <div className="text-[9px] text-slate-400 text-center font-medium bg-slate-100 border-t border-slate-200 py-1.5">
                Dati forniti da Open-Meteo API
            </div>
        </div>
    );
}
