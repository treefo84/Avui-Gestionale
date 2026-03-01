import React from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, List } from "lucide-react";

type Props = {
  currentDate: Date;
  calendarView: "month" | "week" | "table";
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onSetView: (v: "month" | "week" | "table") => void;
};

export const CalendarHeader = React.memo(function CalendarHeader({
  currentDate,
  calendarView,
  onPrev,
  onToday,
  onNext,
  onSetView,
}: Props) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-3xl font-bold text-slate-800 capitalize min-w-[200px]">
          {calendarView === "month"
            ? format(currentDate, "MMMM yyyy", { locale: it })
            : calendarView === "week"
              ? `Settimana ${format(currentDate, "w", { locale: it })}`
              : "Visione Globale"}
        </h2>

        {calendarView !== "table" && (
          <div className="flex gap-2">
            <button
              onClick={onPrev}
              className="p-2 hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={onToday}
              className="px-4 py-2 text-sm font-medium hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200 text-slate-600"
            >
              Oggi
            </button>

            <button
              onClick={onNext}
              className="p-2 hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="flex bg-slate-200 p-1 rounded-lg">
        <button
          onClick={() => onSetView("month")}
          className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${calendarView === "month" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
        >
          <CalendarDays size={16} /> Mese
        </button>

        <button
          onClick={() => onSetView("week")}
          className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${calendarView === "week" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
        >
          <CalendarRange size={16} /> Settimana
        </button>

        <button
          onClick={() => onSetView("table")}
          className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${calendarView === "table" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
        >
          <List size={16} /> Tabella
        </button>
      </div>
    </div>
  );
});
