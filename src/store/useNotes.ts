// src/store/useNotes.ts
import { create } from "zustand";
import { extractLinks } from "../utils/mdLinks";

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

const INITIAL_NOTES = [
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
];

const DEPS: Dependency[] = INITIAL_NOTES.flatMap((note) => {
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
});

export const useNotes = create<NotesState>((set) => ({
  notes: INITIAL_NOTES,
  dependencies: DEPS,

  activeNoteId: "1",
  // Создает новую заметку с уникальным ID, дефолтным заголовком и пустым текстом. Добавляет её в список и сразу делает активной (activeNoteId).
  createNote: () =>
    set((state) => {
      const id = crypto.randomUUID();
      const now = Date.now();
      const newNote = {
        id,
        title: "",
        content: "",
        createdAt: now,
        updatedAt: now,
      };
      return {
        notes: [newNote, ...state.notes],
        activeNoteId: id,
      };
    }),
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
