// src/components/Sidebar.tsx

import {
  memo,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import { useNotes } from "../store/useNotes";
import { supabase } from "../lib/supabase";

interface SidebarProps {
  currentTab: "editor" | "graph";
  onChangeTab: (tab: "editor" | "graph") => void;
  onCloseMobileMenu?: () => void;
}

/**
 * Боковая панель навигации и списка заметок.
 * Обернута в React.memo: компонент не будет лишний раз перерисовываться,
 * если в App.tsx изменится состояние, не влияющее на currentTab или onChangeTab.
 */
export const Sidebar = memo(function Sidebar({
  currentTab,
  onChangeTab,
  onCloseMobileMenu
}: SidebarProps) {
  // Точечные селекторы Zustand: подписываемся только на нужные поля и экшены,
  // чтобы изменения в dependencies (графе связей) не вызывали ререндер сайдбара.
  const notes = useNotes((state) => state.notes);
  const deleteNote = useNotes((state) => state.deleteNote);
  const activeNodeId = useNotes((state) => state.activeNoteId);
  const setActiveNoteId = useNotes((state) => state.setActiveNoteId);
  const createNote = useNotes((state) => state.createNote);
  const isLoadingNotes = useNotes((state) => state.isLoadingNotes);

  // Хранит ID заметки, чью ссылку только что скопировали (для смены иконки 📋 -> ✅ на 1.5 сек)
  const [copied, setCopied] = useState("");

  // Копирует UUID заметки в буфер обмена для вставки вики-ссылок [[ID]]
  async function handleCopyNoteId(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    id: string,
  ): Promise<void> {
    // Обязательно останавливаем всплытие (stopPropagation), иначе клик по кнопке
    // провалится в родительскую карточку и переключит активную заметку.
    event.stopPropagation();
    await navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(""), 1500);
  }

  // Удаление заметки по клику на корзину
  function handleRemoveNote(
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    id: string,
  ): void {
    // Останавливаем всплытие, чтобы не открыть удаляемую заметку в редакторе
    event.stopPropagation();
    deleteNote(id);
  }

  function handleClickEditor(): void {
    onChangeTab("editor");
    onCloseMobileMenu?.();
  }

  function handleClickGraph(): void {
    onChangeTab("graph");
    onCloseMobileMenu?.();
  }

  // Выбор заметки из списка: делаем её активной и принудительно открываем вкладку редактора
  function handleNoteClick(
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    id: string,
  ): void {
    event.stopPropagation();
    setActiveNoteId(id);
    onChangeTab("editor");
    onCloseMobileMenu?.();
  }

  // Создание новой заметки (оптимистично добавляется в стор и сразу открывается в редакторе)
  function handleCreate(): void {
    onChangeTab("editor");
    createNote();
    onCloseMobileMenu?.();
  }

  // Выход из аккаунта: Supabase удалит токен сессии, а слушатель onAuthStateChange
  // в App.tsx поймает это событие и автоматически вернет экран логина <Auth />.
  async function handleLogout() {
    await supabase.auth.signOut();
  }

  const [searchQuery, setSearchQuery] = useState("");
  const deferredQuery = useDeferredValue(searchQuery);

  const filteredNotes = useMemo(() => {
    const query = deferredQuery.trim().toLowerCase();
    return query.length
      ? notes.filter(
          (note) =>
            note.title.toLowerCase().includes(query) ||
            note.content.toLowerCase().includes(query),
        )
      : notes;
  }, [notes, deferredQuery]);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearchQuery(e.target.value);
  }

  function handleQueryReset(): void {
    setSearchQuery("");
  }

  return (
    <div className="w-full flex-1 bg-white flex flex-col h-full select-none relative">
      {/* Шапка сайдбара с кнопкой создания новой заметки и кнопкой закрытия на мобильных */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
        <span className="font-bold text-slate-700 tracking-tight truncate">
          Мои заметки
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
            onClick={handleCreate}
          >
            + Новая
          </button>
          <button
            type="button"
            onClick={onCloseMobileMenu}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg md:hidden"
            aria-label="Закрыть меню"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Переключатель экранов (Редактор / Граф связей) */}
      <div className="p-3 border-b border-slate-100">
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              currentTab === "editor"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={handleClickEditor}
          >
            Редактор
          </button>
          <button
            type="button"
            className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              currentTab === "graph"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={handleClickGraph}
          >
            Граф связей
          </button>
        </div>
      </div>

      {/* Слот для портала автокомплита вики-ссылок из NoteEditor */}
      <div id="sidebar-link-autocomplete-slot" />

      {/* Поле поиска */}
      <div className="px-3 pt-3">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={handleQueryChange}
            placeholder="Поиск по заметкам..."
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-slate-100 border border-transparent rounded-lg focus:bg-white focus:border-indigo-300 focus:outline-none transition-colors placeholder-slate-400"
          />
          {!!searchQuery.length && (
            <button
              type="button"
              title="Очистить поиск"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              onClick={handleQueryReset}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Прокручиваемая область списка заметок */}
      <div
        className={`flex-1 overflow-y-auto p-2 space-y-1 transition-opacity duration-150 ${
          searchQuery !== deferredQuery ? "opacity-60" : "opacity-100"
        }`}
      >
        {/* Точечный скелетон загрузки (Progressive Loading) */}
        {isLoadingNotes && (
          <div className="space-y-2.5 pt-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="p-3 rounded-xl border border-slate-100 space-y-2"
              >
                <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* Заглушка при пустом поиске */}
        {!isLoadingNotes && !!searchQuery.length && !filteredNotes.length && (
          <div className="px-2.5 py-4 text-center opacity-50 text-sm">
            Ничего не найдено
          </div>
        )}

        {/* Реальный список заметок после завершения загрузки */}
        {!isLoadingNotes &&
          filteredNotes.map((note) => (
            <div
              className={`group flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                activeNodeId === note.id
                  ? "bg-indigo-50/80 border-indigo-200"
                  : "border-transparent hover:bg-slate-50"
              }`}
              key={note.id}
              data-note-id={note.id}
              onClick={(e) => handleNoteClick(e, note.id)}
            >
              <div className="min-w-0 flex-1 pr-2">
                <div className="text-sm font-medium text-slate-800 truncate">
                  {note.title}
                </div>
                <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                  ID: {note.id}
                </div>
              </div>

              {/* Панель быстрых действий (копировать ID, удалить):
                  на мобильных видна всегда, на десктопе появляется при наведении */}
              <div className="flex items-center space-x-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {copied !== note.id ? (
                  <button
                    type="button"
                    title="Скопировать ID для ссылки"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-white transition-colors"
                    onClick={(e) => handleCopyNoteId(e, note.id)}
                  >
                    📋
                  </button>
                ) : (
                  <button
                    type="button"
                    title="Скопировано"
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-white transition-colors"
                    onClick={(e) => handleCopyNoteId(e, note.id)}
                  >
                    ✅
                  </button>
                )}

                <button
                  type="button"
                  title="Удалить заметку"
                  className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-white transition-colors"
                  onClick={(e) => handleRemoveNote(e, note.id)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Футер боковой панели с кнопкой выхода из аккаунта */}
      <div className="p-3 border-t border-slate-100 mt-auto">
        <button
          type="button"
          className="w-full py-2 px-3 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          onClick={handleLogout}
        >
          <span>Выйти из аккаунта</span>
        </button>
      </div>
    </div>
  );
});
