// src/components/LinkAutocompletePortal.tsx
import { createPortal } from "react-dom";
import type { Note } from "../store/useNotes";

interface LinkAutocompletePortalProps {
  isOpen: boolean;
  links: Note[];
  selectedIndex: number;
  onSelect: (id: string, title: string) => void;
  onClose: () => void;
}

export function LinkAutocompletePortal({
  isOpen,
  links,
  selectedIndex,
  onSelect,
  onClose,
}: LinkAutocompletePortalProps) {
  const portalTarget = document.getElementById("sidebar-link-autocomplete-slot");

  if (!isOpen || !portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className="absolute inset-0 z-30 bg-slate-900/25 flex flex-col justify-start p-3 pt-28 animate-fadeIn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-xl"
      >
        <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between text-[11px] font-semibold text-indigo-700">
          <span>🔗 Выберите заметку</span>
          <span className="font-normal text-indigo-500">↑↓ · Enter · Esc</span>
        </div>

        <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 bg-white">
          {links.map((n, idx) => (
            <div
              key={n.id}
              onClick={() => onSelect(n.id, n.title)}
              className={`px-3 py-3 text-xs truncate transition-colors cursor-pointer ${
                selectedIndex === idx
                  ? "bg-indigo-50 text-indigo-600 font-semibold"
                  : "hover:bg-slate-50 text-slate-700"
              }`}
            >
              {n.title.trim() || "Без названия"} | {n.id}
            </div>
          ))}

          {links.length === 0 && (
            <div className="px-3 py-4 text-xs text-slate-400 text-center">
              Заметки не найдены
            </div>
          )}
        </div>
      </div>
    </div>,
    portalTarget,
  );
}
