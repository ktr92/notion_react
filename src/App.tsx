// src/App.tsx

import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { NoteEditor } from "./components/NoteEditor";
import { useNotes } from "./store/useNotes";
import { useEffect, useState } from "react";
import { KnowledgeGraph } from "./components/KnowledgeGraph";
import type { Session } from "@supabase/supabase-js/dist/index.cjs";
import { supabase } from "./lib/supabase";
import { Auth } from "./components/Auth";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const activeNoteId = useNotes((state) => state.activeNoteId);
  const [tab, setTab] = useState<"editor" | "graph">("editor");

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
      setSession(session);
      setIsLoadingAuth(false);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

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
      {!isLoadingAuth && !session && <Auth />}
      {session && <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800 font-sans antialiased">
        <aside className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <Sidebar currentTab={tab} onChangeTab={setTab} />
        </aside>

        <main className="flex-1 flex flex-col min-w-0 h-full">
          {tab === "editor" && <NoteEditor key={activeNoteId} />}
          {tab === "graph" && <KnowledgeGraph onChangeTab={setTab} />}
        </main>
      </div>}
      
      
    </>
  );
}

export default App;
