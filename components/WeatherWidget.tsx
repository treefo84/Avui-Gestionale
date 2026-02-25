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
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        🌤️ Meteo Imperia
                    </h3>
                    <p className="text-xs text-sky-100 font-medium">Coordinate: 43.88°N, 8.02°E</p>
                </div>
            </div>

            <div className="p-4 flex flex-col gap-4">
                {/* Box Situazione Attuale */}
                {current && (
                    <div className="bg-sky-50 rounded-lg p-3 border border-sky-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{getWeatherEmoji(current.weatherCode)}</span>
                            <div>
                                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Adesso</p>
                                <p className="text-xl font-bold text-slate-800">{current.temp}°C</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Vento</p>
                            <p className="text-lg font-bold text-sky-700">
                                {current.windSpeedKnots} <span className="text-xs">kt</span>
                                <span className="ml-1 text-slate-600">({getWindDirection(current.windDirection)})</span>
                            </p>
                        </div>
                    </div>
                )}

                {/* Lista Previsioni Giornaliere */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Previsioni Settimana
                    </div>
                    <div className="divide-y divide-slate-100">
                        {dailyEntries.map((day) => {
                            const dateObj = parseISO(day.date);
                            const dayName = format(dateObj, "EEEE dd", { locale: it });

                            return (
                                <div key={day.date} className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-100/50 transition-colors">
                                    <div className="flex items-center gap-2 w-24">
                                        <span className="text-slate-700 font-semibold text-xs capitalize truncate">{dayName}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 w-8 justify-center">
                                        <span className="text-lg" title={`Codice Meteo: ${day.weatherCode}`}>{getWeatherEmoji(day.weatherCode)}</span>
                                    </div>
                                    <div className="flex flex-col items-end w-16">
                                        <span className="text-xs font-bold text-slate-700">{day.tempMax}°</span>
                                        <span className="text-[10px] text-slate-400">{day.tempMin}°</span>
                                    </div>
                                    <div className="flex flex-col items-end w-20">
                                        <span className="text-xs font-bold text-sky-700">{day.windSpeedMaxKnots} kt</span>
                                        <span className="text-[10px] font-semibold text-slate-500">{getWindDirection(day.windDirectionDominant)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="text-[9px] text-slate-400 text-center font-medium">
                    Dati forniti da Open-Meteo API
                </div>
            </div>
        </div>
    );
}
