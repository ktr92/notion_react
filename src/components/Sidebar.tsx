// src/components/Sidebar.tsx

import { memo, useState } from "react";
import { useNotes } from "../store/useNotes";
import { supabase } from "../lib/supabase";

interface SidebarProps {
  currentTab: "editor" | "graph";
  onChangeTab: (tab: "editor" | "graph") => void;
}

/**
 * Боковая панель навигации и списка заметок.
 * Обернута в React.memo: компонент не будет лишний раз перерисовываться,
 * если в App.tsx изменится состояние, не влияющее на currentTab или onChangeTab.
 */
export const Sidebar = memo(function Sidebar({
  currentTab,
  onChangeTab,
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
  }

  function handleClickGraph(): void {
    onChangeTab("graph");
  }

  // Выбор заметки из списка: делаем её активной и принудительно открываем вкладку редактора
  function handleNoteClick(
    event: React.MouseEvent<HTMLDivElement, MouseEvent>,
    id: string,
  ): void {
    event.stopPropagation();
    setActiveNoteId(id);
    onChangeTab("editor");
  }

  // Создание новой заметки (оптимистично добавляется в стор и сразу открывается в редакторе)
  function handleCreate(): void {
    onChangeTab("editor");
    createNote();
  }

  // Выход из аккаунта: Supabase удалит токен сессии, а слушатель onAuthStateChange
  // в App.tsx поймает это событие и автоматически вернет экран логина <Auth />.
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
  }

  return (
    <>
      <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col h-full select-none">
        {/* Шапка сайдбара с кнопкой создания новой заметки */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-700 tracking-tight">
            Мои заметки
          </span>
          <button
            type="button"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
            onClick={handleCreate}
          >
            + Новая
          </button>
        </div>

        {/* Переключатель экранов (Редактор / Граф связей) */}
        <div className="p-3 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              className={`py-1.5 text-xs font-medium rounded-lg  transition-all cursor-pointer ${currentTab === "editor" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={handleClickEditor}
            >
              Редактор
            </button>
            <button
              type="button"
              className={`py-1.5 text-xs font-medium rounded-lg  transition-all cursor-pointer ${currentTab === "graph" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              onClick={handleClickGraph}
            >
              Граф связей
            </button>
          </div>
        </div>

        {/* Прокручиваемая область списка заметок */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Точечный скелетон загрузки (Progressive Loading):
              показывается только на месте списка, пока fetchNotes() тянет данные из Supabase */}
          {isLoadingNotes && (
            <div className="flex overflow-hidden bg-slate-50 select-none">
              {/* Скелетон левой панели (Sidebar) */}
              <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col h-full  space-y-4">
               

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
              </div>

              
            </div>
          )}

          {/* Реальный список заметок после завершения загрузки */}
          {!isLoadingNotes &&
            notes.map((note) => (
              <div
                className={`group flex items-center justify-between p-2.5 rounded-xl border  cursor-pointer transition-colors ${activeNodeId === note.id ? "bg-indigo-50/80 border-indigo-200" : "border-transparent hover:bg-slate-50"}`}
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
                    скрыта по умолчанию и плавно появляется при наведении курсора на строку (group-hover) */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {copied !== note.id && (
                    <button
                      type="button"
                      title="Скопировать ID для ссылки"
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-white transition-colors"
                      onClick={(e) => handleCopyNoteId(e, note.id)}
                    >
                      📋
                    </button>
                  )}
                  {copied && copied === note.id && (
                    <button
                      type="button"
                      title="Скопировано"
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-white transition-colors"
                      onClick={(e) => handleCopyNoteId(e, note.id)}
                    >
                      ✅
                    </button>
                  )}

                  <button
                    type="button"
                    title="Удалить заметку"
                    className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-white transition-colors"
                    onClick={(e) => handleRemoveNote(e, note.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
        </div>

        {/* Футер боковой панели с кнопкой выхода из аккаунта (mt-auto прижимает блок к низу) */}
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
    </>
  );
});
