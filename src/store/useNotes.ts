/* eslint-disable @typescript-eslint/no-explicit-any */
// src/store/useNotes.ts
import { create } from "zustand";
import { extractLinks } from "../utils/mdLinks";
import { supabase } from "../lib/supabase";

/**
 * Контракт глобального Zustand-стора заметок.
 * Все мутирующие операции работают по паттерну Optimistic UI:
 * сначала мгновенно обновляют локальный интерфейс (0 мс задержки),
 * а затем синхронизируют изменения с облачной БД Supabase (с откатом при сбое сети).
 */
interface NotesState {
  notes: Note[];
  activeNoteId: string | null;
  // Создает новую заметку с уникальным ID, дефолтным заголовком и пустым текстом. Добавляет её в список и сразу делает активной (activeNoteId).
  createNote: () => void;
  // Принимает ID заметки и переключает на неё фокус редактора.
  setActiveNoteId: (id: string) => void;
  // Принимает ID и новую строку. Находит нужную заметку, обновляет ей заголовок и поле updatedAt.
  updateNoteTitle: (id: string, title: string) => void;
  // Принимает ID и новый текст. Находит нужную заметку, обновляет текст Markdown и поле updatedAt.
  updateNoteContent: (id: string, content: string) => void;
  // Принимает ID, удаляет заметку из массива. Если удаляемая заметка была активной — сбрасывает activeNoteId в null.
  deleteNote: (id: string) => void;
  dependencies: Dependency[];
  isLoadingNotes: boolean;
  fetchNotes: () => Promise<void>;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

interface Dependency {
  fromNoteId: Note["id"];
  toNoteId: Note["id"];
}

// Второй аргумент `get` позволяет читать актуальный снимок состояния перед мутациями (нужно для Rollback)
export const useNotes = create<NotesState>((set, get) => ({
  notes: [],
  dependencies: [],
  isLoadingNotes: false,
  activeNoteId: null,

  // Начальная загрузка данных пользователя из Supabase (вызывается в App.tsx после авторизации)
  fetchNotes: async () => {
    set({ isLoadingNotes: true });

    try {
      // Формируем два независимых запроса: политики RLS в БД сами отфильтруют записи по user_id из токена
      const getNotes = supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      const getDependencies = supabase.from("dependencies").select("*");

      // Выполняем оба запроса параллельно, чтобы не тратить время на последовательное ожидание сети
      const [notes, dependencies] = await Promise.all([
        getNotes,
        getDependencies,
      ]);
      let formattedNotes: Note[] = [];
      let formattedDependencies: Dependency[] = [];

      // Маппинг полей из формата PostgreSQL (snake_case) в формат TypeScript-клиента (camelCase)
      if (notes.data) {
        formattedNotes = notes.data.map((row) => ({
          id: row.id,
          title: row.title,
          content: row.content,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      }
      if (dependencies.data) {
        formattedDependencies = dependencies.data.map((row) => ({
          fromNoteId: row.from_note_id,
          toNoteId: row.to_note_id,
        }));
      }
      set({
        notes: formattedNotes,
        dependencies: formattedDependencies,
      });
    } catch (error) {
      console.log(error);
    } finally {
      // Гарантированно выключаем скелетон загрузки даже при ошибке сети
      set({ isLoadingNotes: false });
    }
  },

  // Создает новую заметку с уникальным ID, дефолтным заголовком и пустым текстом. Добавляет её в список и сразу делает активной (activeNoteId).
  createNote: async () => {
    // Достаем сессию из памяти браузера (быстрее, чем сетевой getUser) для получения user_id
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    // Генерируем UUID на клиенте, чтобы не ждать ответа от сервера перед открытием редактора
    const id = crypto.randomUUID();
    const now = Date.now();

    // 1. Снимок (Snapshot) текущего состояния для отката в случае сбоя сети
    const prevNotes = get().notes;
    const prevActiveId = get().activeNoteId;

    const newNote = {
      id,
      title: "",
      content: "",
      createdAt: now,
      updatedAt: now,
    };

    // 2. Optimistic UI: мгновенно добавляем карточку в стор и переключаем фокус (0 мс)
    set((state) => ({
      notes: [newNote, ...state.notes],
      activeNoteId: id,
    }));

    // 3. Фоновый запрос в Supabase (обязательно передаем user_id, иначе сработает запрет RLS)
    try {
      const { error } = await supabase.from("notes").insert({
        id: newNote.id,
        user_id: session.user.id,
        title: newNote.title,
        content: newNote.content,
        created_at: newNote.createdAt,
        updated_at: newNote.updatedAt,
      });
      // 4. Rollback: если база отклонила вставку, возвращаем стор к исходному снимку
      if (error) {
        set({ notes: prevNotes, activeNoteId: prevActiveId });
      }
    } catch (error) {
      set({ notes: prevNotes, activeNoteId: prevActiveId });
      console.log(error);
    }
  },

  // Принимает ID заметки и переключает на неё фокус редактора.
  setActiveNoteId: (id: string) => set(() => ({ activeNoteId: id })),

  // Принимает ID и новую строку. Находит нужную заметку, обновляет ей заголовок и поле updatedAt.
  updateNoteTitle: async (id: string, title: string) => {
    // 1. Снимок до изменения
    const prevNotes = get().notes;

    // 2. Optimistic UI: мгновенно обновляем заголовок в сайдбаре и графе
    set((state) => ({
      notes: state.notes.map((note: Note) =>
        note.id === id ? { ...note, title, updatedAt: Date.now() } : note,
      ),
    }));

    // 3. Фоновое сохранение в БД + откат при ошибке
    try {
      const { error } = await supabase
        .from("notes")
        .update({ title, updated_at: Date.now() })
        .eq("id", id);
      if (error) {
        set({
          notes: prevNotes,
        });
      }
    } catch (error) {
      set({
        notes: prevNotes,
      });
    }
  },

  // Принимает ID и новый текст. Находит нужную заметку, обновляет текст Markdown и поле updatedAt.
  updateNoteContent: async (id: string, content: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    // 1. Снимки заметок и связей для полного отката транзакции при ошибке
    const prevNotes = get().notes;
    const prevDependencies = get().dependencies;

    // Единая метка времени для клиента и БД (критично для защиты от эхо-пакетов в Realtime)
    const now = Date.now();

    // Парсим вики-ссылки [[ID]] из нового текста и пересчитываем исходящие связи этой заметки
    const links = extractLinks(content);
    const deps = get().dependencies.filter((dep) => dep.fromNoteId !== id);
    const newDeps: Dependency[] = links.map((link) => ({
      fromNoteId: id,
      toNoteId: link,
    }));

    // Фильтруем связи: убираем петли (ссылка на саму себя) и ссылки на несуществующие заметки
    // (иначе PostgreSQL отклонит вставку из-за нарушения FOREIGN KEY и CHECK constraint)
    const validNewDeps = newDeps.filter(
      (dep) =>
        dep.fromNoteId !== dep.toNoteId &&
        get().notes.some((note) => note.id === dep.toNoteId),
    );

    // 2. Optimistic UI: мгновенно обновляем текст и перерисовываем линии в графе
    set((state) => {
      return {
        dependencies: [...deps, ...validNewDeps],
        notes: state.notes.map((note: Note) =>
          note.id === id ? { ...note, content, updatedAt: now } : note,
        ),
      };
    });

    // 3. Фоновая синхронизация текста и связей по паттерну "Удалил старые — вставил новые"
    try {
      // 1. Обновляем текст заметки
      const { error: noteError } = await supabase
        .from("notes")
        .update({ content, updated_at: now })
        .eq("id", id);

      // 2. Удаляем старые исходящие связи этой заметки
      const { error: delError } = await supabase
        .from("dependencies")
        .delete()
        .eq("from_note_id", id);

      // 3. Если есть новые валидные связи (validNewDeps), вставляем их в базу
      let insError = null;
      if (validNewDeps.length > 0) {
        ({ error: insError } = await supabase.from("dependencies").insert(
          validNewDeps.map((dep) => ({
            user_id: session.user.id,
            from_note_id: dep.fromNoteId,
            to_note_id: dep.toNoteId,
          })),
        ));
      }

      // 4. Rollback: если хотя бы один из трех запросов упал — откатываем оба массива
      if (noteError || delError || insError) {
        set({
          notes: prevNotes,
          dependencies: prevDependencies,
        });
      }
    } catch (error) {
      set({
        notes: prevNotes,
        dependencies: prevDependencies,
      });
    }
  },

  // Принимает ID, удаляет заметку из массива. Если удаляемая заметка была активной — сбрасывает activeNoteId в null.
  deleteNote: async (id: string) => {
    // 1. Снимки всех трех полей, которые затрагивает удаление
    const prevNotes = get().notes;
    const prevDependencies = get().dependencies;
    const prevActiveId = get().activeNoteId;

    // 2. Optimistic UI: убираем заметку, сбрасываем фокус и чистим все входящие/исходящие стрелки в графе
    set((state) => ({
      activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
      notes: state.notes.filter((note) => note.id !== id),
      dependencies: state.dependencies.filter(
        (dep) => dep.fromNoteId !== id && dep.toNoteId !== id,
      ),
    }));

    // 3. Удаляем только строку из `notes` — связанные записи в `dependencies` база удалит сама (ON DELETE CASCADE)
    try {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) {
        set({
          notes: prevNotes,
          dependencies: prevDependencies,
          activeNoteId: prevActiveId,
        });
      }
    } catch (error) {
      set({
        notes: prevNotes,
        dependencies: prevDependencies,
        activeNoteId: prevActiveId,
      });
    }
  },

  // Диспетчер входящих WebSocket-событий от Supabase Realtime (INSERT / UPDATE / DELETE из других вкладок/устройств).
  // Внутри должен маппить payload.new из snake_case в camelCase, игнорировать дубли при INSERT
  // и проверять incomingNote.updatedAt > localNote.updatedAt при UPDATE (защита от эхо-эффекта).
  handleRealtimeNote: (payload) => {

  }
}));
