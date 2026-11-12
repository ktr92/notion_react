// src/App.tsx

import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { NoteEditor } from "./components/NoteEditor";
import { useNotes } from "./store/useNotes";
import { useState } from "react";

function App() {
  const activeNoteId = useNotes((state) => state.activeNoteId);
  const [tab, setTab] = useState<'editor' | 'graph'>('editor');
  return (
    <>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800 font-sans antialiased">
        <aside className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <Sidebar currentTab={tab} onChangeTab={setTab}/>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 h-full">
          {tab === 'editor' && <NoteEditor key={activeNoteId} />}
          {tab === 'graph' && <div>Тут скоро будет граф</div>}
        </main>
      </div>
    </>
  );
}

export default App;
