import { create } from "zustand";

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
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export const useNotes = create<NotesState>((set) => ({
  notes: [],
  activeNoteId: null,
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
    set((state) => ({
      notes: state.notes.map((note: Note) =>
        note.id === id ? { ...note, content, updatedAt: Date.now() } : note,
      ),
    })),
  // Принимает ID, удаляет заметку из массива. Если удаляемая заметка была активной — сбрасывает activeNoteId в null.
  deleteNote: (id: string) =>
    set((state) => ({ activeNoteId: state.activeNoteId === id ? null : state.activeNoteId, notes: state.notes.filter((note) => note.id !== id) })),
}));
