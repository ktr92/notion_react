
export function Sidebar() {
 return (
  <>
  <aside className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col h-full select-none">
  <div className="p-4 border-b border-slate-100 flex items-center justify-between">
    <span className="font-bold text-slate-700 tracking-tight">Мои заметки</span>
    <button
      type="button"
      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors cursor-pointer"
    >
      + Новая
    </button>
  </div>

  <div className="p-3 border-b border-slate-100">
    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl">
      <button
        type="button"
        className="py-1.5 text-xs font-medium rounded-lg bg-white text-slate-800 shadow-sm transition-all cursor-pointer"
      >
        Редактор
      </button>
      <button
        type="button"
        className="py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
      >
        Граф связей
      </button>
    </div>
  </div>
  <div className="flex-1 overflow-y-auto p-2 space-y-1">
    <div className="group flex items-center justify-between p-2.5 rounded-xl border bg-indigo-50/80 border-indigo-200 cursor-pointer transition-colors">
      <div className="min-w-0 flex-1 pr-2">
        <div className="text-sm font-medium text-slate-800 truncate">
          Заголовок заметки или "Без названия"
        </div>
        <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
          ID: 123e4567-e89b...
        </div>
      </div>

      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          title="Скопировать ID для ссылки"
          className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-white transition-colors"
        >
          📋
        </button>
        <button
          type="button"
          title="Удалить заметку"
          className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-white transition-colors"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>
</aside>
  </>
 )
}


