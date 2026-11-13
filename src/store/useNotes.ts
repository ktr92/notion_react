/* eslint-disable @typescript-eslint/no-explicit-any */
// src/store/useNotes.ts
import { create } from "zustand";
import { extractLinks } from "../utils/mdLinks";
import { supabase } from "../lib/supabase";

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

/* const INITIAL_NOTES = [
  {
    id: "1",
    title: "первая ",
    content: "## title1 [[2]] [[3]]",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "2",
    title: "вторая",
    content: "## title2 [[1]]",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: "3",
    title: "третья",
    content: "## title2 [[1]]",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
]; */

/* const DEPS: Dependency[] = INITIAL_NOTES.flatMap((note) => {
  const links = extractLinks(note.content);
  const noteDeps: Dependency[] = links.map((link) => ({
    fromNoteId: note.id,
    toNoteId: link,
  }));

  const filtered = noteDeps.filter(
    (dep) =>
      dep.fromNoteId !== dep.toNoteId &&
      INITIAL_NOTES.some((note) => note.id === dep.toNoteId),
  );

  return filtered;
}); */

export const useNotes = create<NotesState>((set, get) => ({
  notes: [],
  dependencies: [],
  isLoadingNotes: false,
  activeNoteId: null,
  fetchNotes: async () => {
    set({ isLoadingNotes: true });

    try {
      const getNotes = supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      const getDependencies = supabase.from("dependencies").select("*");

      const [notes, dependencies] = await Promise.all([
        getNotes,
        getDependencies,
      ]);
      let formattedNotes: Note[] = [];
      let formattedDependencies: Dependency[] = [];

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
      set({ isLoadingNotes: false });
    }
  },
  // Создает новую заметку с уникальным ID, дефолтным заголовком и пустым текстом. Добавляет её в список и сразу делает активной (activeNoteId).
  createNote: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return;
    const id = crypto.randomUUID();
    const now = Date.now();

    const prevNotes = get().notes;
    const prevActiveId = get().activeNoteId

    const newNote = {
      id,
      title: "",
      content: "",
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      notes: [newNote, ...state.notes],
      activeNoteId: id,
    }));

    // Фоновый запрос в Supabase
    try {
      const { error } = await supabase.from("notes").insert({
        id: newNote.id,
        user_id: session.user.id,
        title: newNote.title,
        content: newNote.content,
        created_at: newNote.createdAt,
        updated_at: newNote.updatedAt,
      });
      if (error) {
        set({ notes: prevNotes, activeNoteId: prevActiveId });
      }
    } catch (error) {
      set({ notes: prevNotes, activeNoteId: prevActiveId  });
      console.log(error)
    }
  },

  // Принимает ID заметки и переключает на неё фокус редактора.
  setActiveNoteId: (id: string) => set(() => ({ activeNoteId: id })),
  // Принимает ID и новую строку. Находит нужную заметку, обновляет ей заголовок и поле updatedAt.
  updateNoteTitle: (id: string, title: string) =>
    set((state) => ({
      notes: state.notes.map((note: Note) =>
        note.id === id ? { ...note, title, updatedAt: Date.now() } : note,
      ),
    })),
  // Принимает ID и новый текст. Находит нужную заметку, обновляет текст Markdown и поле updatedAt.
  updateNoteContent: (id: string, content: string) =>
    set((state) => {
      const links = extractLinks(content);
      const deps = state.dependencies.filter((dep) => dep.fromNoteId !== id);
      const newDeps: Dependency[] = links.map((link) => ({
        fromNoteId: id,
        toNoteId: link,
      }));

      return {
        dependencies: [
          ...deps,
          ...newDeps.filter(
            (dep) =>
              dep.fromNoteId !== dep.toNoteId &&
              state.notes.some((note) => note.id === dep.toNoteId),
          ),
        ],
        notes: state.notes.map((note: Note) =>
          note.id === id ? { ...note, content, updatedAt: Date.now() } : note,
        ),
      };
    }),
  // Принимает ID, удаляет заметку из массива. Если удаляемая заметка была активной — сбрасывает activeNoteId в null.
  deleteNote: (id: string) =>
    set((state) => ({
      activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
      notes: state.notes.filter((note) => note.id !== id),
      dependencies: state.dependencies.filter(
        (dep) => dep.fromNoteId !== id && dep.toNoteId !== id,
      ),
    })),
}));
