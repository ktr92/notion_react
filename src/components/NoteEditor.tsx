import { useEffect, useState } from "react";
import { parseMarkdown } from "../utils/mdParser";
import { useNotes } from "../store/useNotes";

export function NoteEditor() {
  const noteId = useNotes((state) => state.activeNoteId);
  const note = useNotes((state) =>
    state.notes.find((note) => note.id === noteId),
  );

  const saveTitle = useNotes((state) => state.updateNoteTitle);
  const saveContent = useNotes((state) => state.updateNoteContent);
  const changeNote = useNotes((state) => state.setActiveNoteId);
  const notes = useNotes((state) => state.notes);

  const [mode, setMode] = useState<"Edit" | "Preview">("Edit");
  const [title, setTitle] = useState(note ? note.title : "");
  const [content, setContent] = useState(note ? note.content : "");

  const isTyping = title !== note?.title || content !== note?.content;

  const handleEdit = () => {
    setMode("Edit");
  };
  const handleChangeTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };
  const handleChangeText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };
  const handlePreview = () => {
    setMode("Preview");
  };
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const isbutton = target.closest("[data-note-id]") as HTMLElement;

    if (isbutton) {
      const linkId = isbutton.dataset.noteId;
      if (linkId) {
        if (notes.some((note) => note.id === linkId)) {
          changeNote(linkId);
        }
      }
    }
  };

  useEffect(() => {
    if (!noteId) return;

    let timeout: ReturnType<typeof setTimeout>;
    if (title !== note?.title || content !== note?.content) {
      timeout = setTimeout(() => {
        if (title !== note?.title) {
          saveTitle(noteId!, title);
        }
        if (content !== note?.content) {
          saveContent(noteId!, content);
        }
      }, 500);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [title, content]);

  if (!noteId) {
    return <div>Такой заметки нет... Создайте новую заметку.</div>;
  }

  return (
    <>
      <div className="flex flex-col h-full bg-slate-50 text-slate-800 font-sans antialiased">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
          <input
            type="text"
            placeholder="Без названия"
            className="text-xl font-bold bg-transparent border-none outline-none focus:ring-0 w-1/2 placeholder-slate-400"
            value={title}
            onChange={handleChangeTitle}
          />

          <div className="flex items-center bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200">
            <button
              onClick={handleEdit}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium  transition-all duration-200 ${mode === "Edit" ? "bg-white text-slate-800 shadow-sm" : " text-slate-500 hover:text-slate-800"}`}
            >
              <svg
                xmlns="http://w3.org"
                className="h-4 w-4 text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              <span>Edit</span>
            </button>

            <button
              onClick={handlePreview}
              className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-sm font-medium  transition-all duration-200 ${mode === "Preview" ? "bg-white text-slate-800 shadow-sm" : " text-slate-500 hover:text-slate-800"}`}
            >
              <svg
                xmlns="http://w3.org"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>Preview</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white m-4 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {mode === "Edit" && (
            <div className="flex-1 flex flex-col p-6 min-h-0">
              <textarea
                value={content}
                onChange={handleChangeText}
                placeholder="Начните писать здесь в формате Markdown..."
                className="flex-1 w-full resize-none border-none outline-none focus:ring-0 p-0 text-slate-700 font-mono text-base leading-relaxed placeholder-slate-400 focus:outline-none"
              ></textarea>

              {isTyping && (
                <div className="flex justify-end items-center space-x-2 text-xs text-slate-400 font-mono pt-3 border-t border-slate-100">
                  <span className="inline-block w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                  <span>Печатает (ожидание сохранения...)</span>
                </div>
              )}
              {!isTyping && (
                <div className="flex justify-end items-center space-x-2 text-xs text-slate-400 font-mono pt-3 border-t border-slate-100">
                  <span className="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>Сохранено</span>
                </div>
              )}
            </div>
          )}

          {mode === "Preview" && (
            <div
              className="flex-1 overflow-y-auto p-8 text-slate-600 leading-relaxed space-y-4
                [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-slate-600 [&>h1]:mt-0 [&>h1]:mb-4 [&>h1]:border-b [&>h1]:pb-2
                [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-slate-600 [&>h2]:mt-0 [&>h2]:mb-3
                [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-slate-600 [&>h3]:mt-0 [&>h3]:mb-2
                [&>p]:mb-3
                [&>strong]:font-semibold [&>strong]:text-slate-600
                [&>br]:mb-2
                [&_button]:text-blue-500"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
              onClick={handlePreviewClick}
            ></div>
          )}
        </div>
      </div>
    </>
  );
}
