// src/App.tsx

import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { NoteEditor } from "./components/NoteEditor";
import { useNotes } from "./store/useNotes";
import { useEffect, useState } from "react";
import { KnowledgeGraph } from "./components/KnowledgeGraph";

function App() {
  const activeNoteId = useNotes((state) => state.activeNoteId);
  const [tab, setTab] = useState<"editor" | "graph">("editor");

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
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800 font-sans antialiased">
        <aside className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <Sidebar currentTab={tab} onChangeTab={setTab} />
        </aside>

        <main className="flex-1 flex flex-col min-w-0 h-full">
          {tab === "editor" && <NoteEditor key={activeNoteId} />}
          {tab === "graph" && <KnowledgeGraph />}
        </main>
      </div>
    </>
  );
}

export default App;
