/* eslint-disable react-hooks/refs */
import { useRef } from "react";
import { useNotes } from "../store/useNotes";

interface Coordinates {
  x: number;
  y: number;
}

interface Drag {
  noteId: string;
  startX: Coordinates["x"];
  startY: Coordinates["y"];
  initialNodeX: Coordinates["x"];
  initialNodeY: Coordinates["y"];
  hasMoved: boolean;
}

export const KnowledgeGraph = function ({ onChangeTab }) {
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

  const dragRef = useRef<Drag | null>(null);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>, noteId: string) {
    dragRef.current = {
      noteId: noteId,
      startX: event.clientX,
      startY: event.clientY,
      initialNodeX: coordsRef.current[noteId].x,
      initialNodeY: coordsRef.current[noteId].y,
      hasMoved: false,
    };
    nodeRefs.current[noteId]?.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>, noteId: string) {
    if (!dragRef.current || !dragRef.current.noteId) return;
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.hasMoved = true;
    }
      const newX = dx + dragRef.current.initialNodeX;
      const newY = dy + dragRef.current.initialNodeY;

      coordsRef.current[noteId].x = newX;
      coordsRef.current[noteId].y = newY;

      nodeRefs.current[noteId].style.transform =
        `translate3d(${newX}px, ${newY}px, 0)`;

      dependencies.forEach((dep) => {
        if (dep.fromNoteId === noteId) {
          edgeRefs.current[`${dep.fromNoteId}-${dep.toNoteId}`]?.setAttribute("x1", String(newX + 80));
          edgeRefs.current[`${dep.fromNoteId}-${dep.toNoteId}`]?.setAttribute("y1", String(newY + 24));
        }
        if (dep.toNoteId === noteId) {
          edgeRefs.current[`${dep.fromNoteId}-${dep.toNoteId}`]?.setAttribute("x2", String(newX + 80));
          edgeRefs.current[`${dep.fromNoteId}-${dep.toNoteId}`]?.setAttribute("y2", String(newY + 24));
        }
      });
    
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>, noteId: string) {
    nodeRefs.current[noteId]?.releasePointerCapture(event.pointerId);
    dragRef.current.noteId = null;
    if (!dragRef.current?.hasMoved) {
      setActiveNoteId(noteId);
      onChangeTab('editor')
    }
  }

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
            onPointerDown={(e) => handlePointerDown(e, note.id)}
            onPointerMove={(e) => handlePointerMove(e, note.id)}
            onPointerUp={(e) => handlePointerUp(e, note.id)}
          >
            {note.title}
          </div>
        ))}
      </div>
    </>
  );
};
