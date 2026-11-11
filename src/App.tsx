import "./App.css";
import { Sidebar } from "./components/Sidebar";
import { NoteEditor } from "./components/NoteEditor";
import { useNotes } from "./store/useNotes";

function App() {
  const activeNoteId = useNotes((state) => state.activeNoteId);
  return (
    <>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800 font-sans antialiased">
        <aside className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
          <Sidebar />
        </aside>

        <main className="flex-1 flex flex-col min-w-0 h-full">
          <NoteEditor key={activeNoteId} />
        </main>
      </div>
    </>
  );
}

export default App;
