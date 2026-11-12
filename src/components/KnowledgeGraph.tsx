/* eslint-disable react-hooks/refs */
import { useEffect, useRef } from "react";
import { useNotes } from "../store/useNotes";

interface Coordinates {
  x: number;
  y: number;
}

export const KnowledgeGraph = function () {
  const notes = useNotes((state) => state.notes);
  const dependencies = useNotes((state) => state.dependencies);
  const setActiveNoteId = useNotes((state) => state.setActiveNoteId);

  const coordsRef = useRef<Record<string, Coordinates>>({});
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const edgeRefs = useRef<Record<string, SVGLineElement | null>>({});

  notes.forEach((note, index) => {
    if (!coordsRef.current[note.id]) {
      const angle = (index / Math.max(notes.length, 1)) * Math.PI * 2;
      coordsRef.current[note.id] = {
        x: Math.round(400 + 180 * Math.cos(angle)),
        y: Math.round(300 + 180 * Math.sin(angle)),
      };
    }
  });

  return (
    <>
      <div className="relative w-full h-full overflow-hidden bg-slate-50 select-none">
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {dependencies.map((dep) => {
            const edgeKey = `${dep.fromNoteId}-${dep.toNoteId}`;
            const from = coordsRef.current[dep.fromNoteId] ?? { x: 0, y: 0 };
            const to = coordsRef.current[dep.toNoteId] ?? { x: 0, y: 0 };

            return (
              <line
                key={edgeKey}
                ref={(el) => {
                  edgeRefs.current[edgeKey] = el;
                }}
                x1={from.x + 80}
                y1={from.y + 24}
                x2={to.x + 80}
                y2={to.y + 24}
                stroke="#cbd5e1"
                strokeWidth="2"
              />
            );
          })}
        </svg>
        {notes.map((note) => (
          <div
            key={note.id}
            className="absolute top-0 left-0 w-40 h-12 bg-white border border-slate-200 rounded-xl shadow-sm px-3 flex items-center justify-center text-sm font-medium text-slate-700 truncate cursor-grab active:cursor-grabbing hover:border-indigo-400 transition-colors z-10"
            style={{
              transform: `translate3d(${coordsRef.current[note.id].x}px, ${coordsRef.current[note.id].y}px, 0)`,
            }}
            ref={(el) => {
              nodeRefs.current[note.id] = el;
            }}
          >
            {note.title}
          </div>
        ))}
      </div>
    </>
  );
};
