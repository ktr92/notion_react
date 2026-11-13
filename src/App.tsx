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

/**
 * Корневой компонент-оркестратор приложения.
 * Отвечает за три глобальные задачи:
 * 1. Жизненный цикл сессии авторизации Supabase (шлюз доступа).
 * 2. Загрузку облачных данных при входе в аккаунт.
 * 3. Двустороннюю синхронизацию URL-хэша (#note-uuid) с активной заметкой в Zustand.
 */
function App() {
  // Состояние текущей сессии пользователя (null — гость, объект Session — авторизован)
  const [session, setSession] = useState<Session | null>(null);

  // Флаг первичной проверки токена в localStorage: блокирует рендер на пару десятков мс,
  // чтобы избежать мелькания экрана логина <Auth /> при обновлении страницы авторизованным юзером.
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const fetchNotes = useNotes(state => state.fetchNotes)
  const activeNoteId = useNotes((state) => state.activeNoteId);

  // Локальный стейт переключения рабочих экранов ("Редактор" / "Граф связей")
  const [tab, setTab] = useState<"editor" | "graph">("editor");

  // 1. Подписка на авторизацию Supabase (запускается один раз при монтировании приложения)
  useEffect(() => {
    // Флаг защиты от утечки памяти и обновления стейта после размонтирования (актуально для React StrictMode)
    let isMounted = true;

    async function getSession() {
      if (isMounted) {
        const { data } = await supabase.auth.getSession();
        setSession(data?.session ?? null);
        setIsLoadingAuth(false);
      }
    }
    getSession();

    // Слушатель событий входа, выхода и автоматического обновления JWT-токена
    const { data } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setIsLoadingAuth(false);
    });

    // Cleanup-функция: отписываемся от слушателя при размонтировании компонента
    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // 2. Загрузка заметок и связей из облака при появлении или смене пользователя
  // (Подсказка: в будущем стоит обернуть вызов в `if (session?.user.id)`, чтобы не делать лишний запрос при выходе)
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes, session?.user.id])

  // 3. Кастомный роутинг (Направление 1: URL -> Zustand).
  // Читает хэш при первой загрузке страницы и при нажатии кнопок браузера "Назад / Вперед" (hashchange).
  useEffect(() => {
    function hashSync() {
      const hash = window.location.hash;
      const isnote = hash.startsWith("#note-");

      if (isnote) {
        const noteId = hash.slice(6); // Отрезаем префикс "#note-"
        // Читаем стор напрямую через getState(), чтобы не переподписывать useEffect на каждый рендер
        const store = useNotes.getState();
        const isexist = store.notes.some((note) => note.id === noteId);
        if (isexist) {
          if (store.activeNoteId !== noteId) {
            store.setActiveNoteId(noteId);
          }
        } else {
          // Если в URL передан несуществующий или удаленный ID — тихо очищаем битый хэш без перезагрузки
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

  // 4. Кастомный роутинг (Направление 2: Zustand -> URL).
  // Обновляет адресную строку браузера при клике на заметку в сайдбаре, графе или по вики-ссылке.
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
      {isLoadingAuth && <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 select-none">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-500 animate-pulse">
        Проверка сессии...
      </p>
    </div>}

      {/* Уровень шлюза 2: пользователь не авторизован — показываем только форму входа/регистрации */}
      {!isLoadingAuth && !session && <Auth />}

      {/* Уровень шлюза 3: пользователь вошел — рендерим основное рабочее пространство */}
      {session && <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800 font-sans antialiased">
        <aside className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <Sidebar currentTab={tab} onChangeTab={setTab} />
        </aside>

        <main className="flex-1 flex flex-col min-w-0 h-full">
          {/* Пропс key={activeNoteId} заставляет React пересоздавать NoteEditor при смене заметки,
              сбрасывая его локальные стейты ввода без лишних useEffect */}
          {tab === "editor" && <NoteEditor key={activeNoteId} />}
          {tab === "graph" && <KnowledgeGraph onChangeTab={setTab} />}
        </main>
      </div>}
      
      
    </>
  );
}

export default App;
