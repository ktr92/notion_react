// src/App.tsx

import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { NoteEditor } from "./components/NoteEditor";
import { useNotes } from "./store/useNotes";
import { useEffect, useState } from "react";
import { KnowledgeGraph } from "./components/KnowledgeGraph";
import type { Session } from "@supabase/supabase-js/";
import { supabase } from "./lib/supabase";
import { Auth } from "./components/Auth";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const fetchNotes = useNotes((state) => state.fetchNotes);
  const resetStore = useNotes((state) => state.resetStore);
  const handleRealtimeDependency = useNotes(
    (state) => state.handleRealtimeDependency,
  );
  const handleRealtimeNote = useNotes((state) => state.handleRealtimeNote);
  const activeNoteId = useNotes((state) => state.activeNoteId);

  const [tab, setTab] = useState<"editor" | "graph">("editor");

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 1. Подписка на авторизацию Supabase
  useEffect(() => {
    let isMounted = true;

    async function getSession() {
      if (isMounted) {
        const { data } = await supabase.auth.getSession();
        setSession(data?.session ?? null);
        setIsLoadingAuth(false);
      }
    }
    getSession();

    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) {
        resetStore();
      }

      setSession(session);
      setIsLoadingAuth(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // 2. Загрузка заметок и связей из облака
  useEffect(() => {
    if (!session?.user.id) return;

    fetchNotes();

    const channel = supabase
      .channel("realtime-notes-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notes" },
        (payload) => {
          handleRealtimeNote(payload);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dependencies" },
        (payload) => {
          handleRealtimeDependency(payload);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    fetchNotes,
    handleRealtimeDependency,
    handleRealtimeNote,
    session?.user.id,
  ]);

  // 3. Кастомный роутинг (Направление 1: URL -> Zustand)
  useEffect(() => {
    function hashSync() {
      const hash = window.location.hash;
      const isnote = hash.startsWith("#note-");

      if (isnote) {
        const noteId = hash.slice(6);
        const store = useNotes.getState();
        const isexist = store.notes.some((note) => note.id === noteId);
        if (isexist) {
          if (store.activeNoteId !== noteId) {
            store.setActiveNoteId(noteId);
          }
        } else {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        }
      }
    }

    hashSync();
    window.addEventListener("hashchange", hashSync);

    return () => window.removeEventListener("hashchange", hashSync);
  }, []);

  // 4. Кастомный роутинг (Направление 2: Zustand -> URL)
  useEffect(() => {
    if (!activeNoteId) {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    }
    if (activeNoteId && window.location.hash !== `#note-${activeNoteId}`) {
      window.location.hash = `#note-${activeNoteId}`;
    }
  }, [activeNoteId]);

  return (
    <>
      {/* Уровень шлюза 1: идет проверка сессии при старте */}
      {isLoadingAuth && (
        <div className="h-[100dvh] w-screen flex flex-col items-center justify-center bg-slate-50 select-none pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            Проверка сессии...
          </p>
        </div>
      )}

      {/* Уровень шлюза 2: пользователь не авторизован */}
      {!isLoadingAuth && !session && <Auth />}

      {/* Уровень шлюза 3: пользователь вошел */}
      {session && (
        <div className="relative flex h-[100dvh] w-screen overflow-hidden bg-slate-100 text-slate-800 font-sans antialiased pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          {/* Затемняющая подложка (Backdrop) на мобильных экранах при открытом меню */}
          {isMobileMenuOpen === true && (
            <div
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] transition-opacity md:hidden"
              aria-hidden="true"
            />
          )}

          {/* Выдвижной сайдбар на мобильных (fixed) и статичный на десктопе (md:static) */}
          <aside
            className={`fixed inset-y-0 left-0 z-40 w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ease-out md:static md:translate-x-0 md:pt-0 md:pb-0 ${
              isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <Sidebar
              currentTab={tab}
              onChangeTab={setTab}
              onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
            />
          </aside>

          {/* Основная рабочая область */}
          <main className="flex-1 flex flex-col min-w-0 h-full">
            {/* Мобильная верхняя шапка с кнопкой открытия сайдбара (видна только на < 768px) */}
            <header className="h-12 flex-shrink-0 bg-white border-b border-slate-200 px-3 flex items-center justify-between md:hidden">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg active:scale-95 transition-all"
                aria-label="Открыть меню заметок"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <span className="text-sm font-semibold text-slate-700 tracking-tight">
                {tab === "editor" ? "Редактор заметок" : "Граф связей"}
              </span>

              {/* Пустой блок для визуального центрирования заголовка */}
              <div className="w-8" />
            </header>

            <div className="flex-1 min-h-0 flex flex-col">
              {tab === "editor" && <NoteEditor key={activeNoteId} />}
              {tab === "graph" && <KnowledgeGraph onChangeTab={setTab} />}
            </div>
          </main>
        </div>
      )}
    </>
  );
}

export default App;
