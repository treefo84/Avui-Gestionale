import React from "react";
import {
  Ship,
  LifeBuoy,
  Skull,
  MessageCircle,
  Wrench,
} from "lucide-react";

import {
  Activity,
  Assignment,
  AssignmentStatus,
  Boat,
  User,
  DayNote,
  MaintenanceRecord,
} from "../types";

interface DayHoverModalProps {
  date: string;
  position: { x: number; y: number };
  data: {
    boat: Boat;
    assignment: Assignment;
    activity: Activity;
    instructor?: User | null;
    helper?: User | null;
  }[];
  notes: DayNote[];

  // ✅ coerente con App.tsx: maintenanceByDate = { expiring: Map, performed: Map }
  maintenance?: {
    expiring: MaintenanceRecord[];
    performed: MaintenanceRecord[];
  };
}

export const DayHoverModal: React.FC<DayHoverModalProps> = ({
  date,
  position,
  data,
  notes,
  maintenance,
}) => {
  const expiring = maintenance?.expiring ?? [];
  const performed = maintenance?.performed ?? [];

  if (data.length === 0 && notes.length === 0 && expiring.length === 0 && performed.length === 0) {
    return null;
  }

  // Determine position direction to avoid screen overflow
  const isRightHalf = position.x > window.innerWidth / 2;
  const isBottomHalf = position.y > window.innerHeight / 2;

  const style: React.CSSProperties = {
    top: position.y,
    left: position.x,
    transform: `translate(${isRightHalf ? "-100%" : "0"}, ${isBottomHalf ? "-100%" : "0"})`,
  };

  // Add offsets
  const xOffset = isRightHalf ? -20 : 20;
  const yOffset = isBottomHalf ? -20 : 20;
  style.top = position.y + yOffset;
  style.left = position.x + xOffset;

  return (
    <div
      className="fixed z-[100] w-72 pointer-events-none bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={style}
    >
      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
        <h4 className="text-white font-bold text-sm capitalize">
          {new Date(date).toLocaleDateString("it-IT", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
        </h4>
        <Ship size={14} className="text-blue-300" />
      </div>

      <div className="p-3 space-y-3 bg-slate-50">
        {/* Notes Section */}
        {notes.length > 0 && (
          <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
            <div className="flex items-center gap-1 text-amber-600 text-[10px] font-bold uppercase mb-1">
              <MessageCircle size={10} /> Messaggi in Bottiglia
            </div>
            {notes.map((note) => (
              <p
                key={note.id}
                className="text-xs text-slate-700 leading-tight italic border-l-2 border-amber-300 pl-2 mb-1 last:mb-0"
              >
                "{note.text}"
              </p>
            ))}
          </div>
        )}

        {/* Maintenance Section */}
        {(expiring.length > 0 || performed.length > 0) && (
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1 text-slate-600 text-[10px] font-bold uppercase mb-2">
              <Wrench size={10} /> Manutenzione
            </div>

            {expiring.length > 0 && (
              <div className="mb-2">
                <div className="text-[10px] font-bold text-amber-700 mb-1">In scadenza</div>
                <ul className="space-y-1">
                  {expiring.map((r) => (
                    <li key={r.id} className="text-xs text-slate-700 truncate">
                      ⏳ {r.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {performed.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-blue-700 mb-1">Registrate</div>
                <ul className="space-y-1">
                  {performed.map((r) => (
                    <li key={r.id} className="text-xs text-slate-700 truncate">
                      ✅ {r.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Assignments Section */}
        {data.map((item, idx) => {
          const isCancelled = item.assignment.status === AssignmentStatus.CANCELLED;

          return (
            <div
              key={idx}
              className={`bg-white p-2 rounded-lg border shadow-sm relative overflow-hidden ${
                isCancelled ? "border-red-200" : "border-slate-200"
              }`}
            >
              {/* Decorative accent */}
              <div
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  isCancelled ? "bg-red-500" : "bg-blue-500"
                }`}
              />

              <div className="flex items-start justify-between mb-2 pl-2">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                    {item.boat.name}
                  </span>
                  <h5
                    className={`font-bold text-sm leading-tight ${
                      isCancelled ? "text-red-600 line-through" : "text-slate-800"
                    }`}
                  >
                    {item.activity.name}
                  </h5>
                  {isCancelled && (
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                      ANNULLATA
                    </span>
                  )}
                </div>
              </div>

              <div className={`space-y-1.5 pl-2 ${isCancelled ? "opacity-50 grayscale" : ""}`}>
                {/* Instructor */}
                <div className="flex items-center gap-2">
                  {item.instructor ? (
                    <>
                      <img
                        src={item.instructor.avatar}
                        className="w-5 h-5 rounded-full border border-slate-200"
                        alt="I"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        {item.instructor.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <Skull size={10} className="text-slate-300" />
                      </div>
                      <span className="text-xs text-slate-400 italic">Nessun Comandante</span>
                    </>
                  )}
                </div>

                {/* Helper */}
                <div className="flex items-center gap-2">
                  {item.helper ? (
                    <>
                      <img
                        src={item.helper.avatar}
                        className="w-5 h-5 rounded-full border border-slate-200"
                        alt="H"
                      />
                      <span className="text-xs font-medium text-slate-700">
                        {item.helper.name}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <LifeBuoy size={10} className="text-slate-300" />
                      </div>
                      <span className="text-xs text-slate-400 italic">Nessun Mozzo</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayHoverModal;