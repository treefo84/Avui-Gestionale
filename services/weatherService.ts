export interface WeatherData {
  time: string[];
  temperature_2m: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  weather_code: number[];
}

export interface DailyWeatherData {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  wind_speed_10m_max: number[];
  wind_direction_10m_dominant: number[];
}

export interface WeatherResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: WeatherData;
  daily: DailyWeatherData;
}

export interface ParsedDailyWeather {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  windSpeedMaxKnots: number;
  windDirectionDominant: number;
}

export interface ParsedHourlyWeather {
  time: string;
  weatherCode: number;
  temp: number;
  windSpeedKnots: number;
  windDirection: number;
}

export interface WeatherDataParsed {
  current?: ParsedHourlyWeather;
  daily: Map<string, ParsedDailyWeather>;
}

export const fetchWeather = async (lat: number, lon: number): Promise<WeatherDataParsed | null> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch weather");
    const data: WeatherResponse = await res.json();

    // Parse Daily
    const dailyMap = new Map<string, ParsedDailyWeather>();
    if (data.daily && data.daily.time) {
      for (let i = 0; i < data.daily.time.length; i++) {
        // km/h to knots
        const knots = data.daily.wind_speed_10m_max[i] * 0.539957;
        dailyMap.set(data.daily.time[i], {
          date: data.daily.time[i],
          weatherCode: data.daily.weather_code[i],
          tempMax: data.daily.temperature_2m_max[i],
          tempMin: data.daily.temperature_2m_min[i],
          windSpeedMaxKnots: Math.round(knots),
          windDirectionDominant: data.daily.wind_direction_10m_dominant[i]
        });
      }
    }

    // Find current hour
    let current: ParsedHourlyWeather | undefined = undefined;
    if (data.hourly && data.hourly.time) {
      const now = new Date();
      // Trova l'indice orario più vicino ad adesso
      let closestIdx = 0;
      let minDiff = Infinity;
      
      for(let i=0; i<data.hourly.time.length; i++) {
          const t = new Date(data.hourly.time[i]);
          const diff = Math.abs(t.getTime() - now.getTime());
          if(diff < minDiff) {
              minDiff = diff;
              closestIdx = i;
          }
      }

      current = {
        time: data.hourly.time[closestIdx],
        weatherCode: data.hourly.weather_code[closestIdx],
        temp: Math.round(data.hourly.temperature_2m[closestIdx]),
        windSpeedKnots: Math.round(data.hourly.wind_speed_10m[closestIdx] * 0.539957),
        windDirection: data.hourly.wind_direction_10m[closestIdx]
      };
    }

    return { current, daily: dailyMap };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return null;
  }
};

// Utils: Codici meteo -> Icone testuali o Emoji
export const getWeatherEmoji = (code: number): string => {
  if (code === 0) return "☀️"; // Sereno
  if (code === 1 || code === 2 || code === 3) return "⛅"; // Poco nuvoloso, nuvoloso
  if (code >= 45 && code <= 48) return "🌫️"; // Nebbia
  if (code >= 51 && code <= 55) return "🌧️"; // Pioggerellina
  if (code >= 61 && code <= 65) return "🌧️"; // Pioggia
  if (code >= 71 && code <= 77) return "❄️"; // Neve
  if (code >= 80 && code <= 82) return "🌦️"; // Acquazzoni
  if (code >= 95 && code <= 99) return "⛈️"; // Temporale
  return "❓";
};

// Utils: Direzione del Vento (Gradi -> Testo)
export const getWindDirection = (degrees: number): string => {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(degrees / 45) % 8];
};
