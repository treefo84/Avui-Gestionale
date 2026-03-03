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
  enableWeekView?: boolean;
};

export const CalendarHeader = React.memo(function CalendarHeader({
  currentDate,
  calendarView,
  onPrev,
  onToday,
  onNext,
  onSetView,
  enableWeekView
}: Props) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between mb-6 md:mb-8 gap-4 w-full">
      <div className="flex items-center justify-between w-full md:w-auto gap-2 md:gap-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800 capitalize truncate md:min-w-[200px] flex-1">
          {calendarView === "month"
            ? format(currentDate, "MMMM yyyy", { locale: it })
            : calendarView === "week"
              ? `Settimana ${format(currentDate, "w", { locale: it })}`
              : "Visione Globale"}
        </h2>

        {calendarView !== "table" && (
          <div className="flex gap-1 sm:gap-2 shrink-0">
            <button
              onClick={onPrev}
              className="p-1.5 sm:p-2 hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={onToday}
              className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200 text-slate-600 shrink-0"
            >
              Oggi
            </button>

            <button
              onClick={onNext}
              className="p-1.5 sm:p-2 hover:bg-white hover:shadow rounded-lg transition-all border border-transparent hover:border-slate-200"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="flex bg-slate-200 p-1 rounded-lg w-full md:w-auto justify-center md:justify-start overflow-x-auto hide-scrollbar">
        <button
          onClick={() => onSetView("month")}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${calendarView === "month" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
        >
          <CalendarDays size={16} /> Mese
        </button>

        {enableWeekView && (
          <button
            onClick={() => onSetView("week")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${calendarView === "week" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
          >
            <CalendarRange size={16} /> Settimana
          </button>
        )}

        <button
          onClick={() => onSetView("table")}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all whitespace-nowrap ${calendarView === "table" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
        >
          <List size={16} /> Tabella
        </button>
      </div>
    </div>
  );
});
