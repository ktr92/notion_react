import './App.css'
import { NoteEditor } from './components/NoteEditor'
import { useNotes } from './store/useNotes';

function App() {
  const activeNoteId = useNotes(state => state.activeNoteId);
  return (
    <>
      <NoteEditor key={activeNoteId}/>
    </>
  )
}

export default App
