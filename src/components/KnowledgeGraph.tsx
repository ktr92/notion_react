/* eslint-disable react-hooks/refs */
import { useRef } from "react";
import { useNotes } from "../store/useNotes";

interface Coordinates {
  x: number;
  y: number;
}

// Состояние активного жеста перетаскивания (живет в useRef, чтобы не вызывать ререндеры)
interface Drag {
  noteId: string;
  startX: Coordinates["x"]; // Координата курсора/пальца в момент нажатия
  startY: Coordinates["y"];
  initialNodeX: Coordinates["x"]; // Координата карточки до начала движения
  initialNodeY: Coordinates["y"];
  hasMoved: boolean; // Флаг: было ли реальное перетаскивание или это просто клик
}

/**
 * Интерактивный граф связей (60 FPS).
 * Главная архитектурная фишка: координаты, ссылки на DOM-узлы и процесс перетаскивания
 * полностью вынесены в useRef. При движении мыши/пальца мы мутируем DOM-стили напрямую,
 * минуя цикл ререндеров React — это дает плавные 60 FPS даже на слабых устройствах.
 */
export const KnowledgeGraph = function ({
  onChangeTab,
}: {
  onChangeTab: (tab: "editor" | "graph") => void;
}) {
  // Точечные селекторы Zustand: компонент перерендерится только при изменении списка заметок или связей
  const notes = useNotes((state) => state.notes);
  const dependencies = useNotes((state) => state.dependencies);
  const setActiveNoteId = useNotes((state) => state.setActiveNoteId);

  // Мутабельное хранилище актуальных (x, y) координат каждой карточки по её ID
  const coordsRef = useRef<Record<string, Coordinates>>({});

  // Словарь прямых ссылок на DOM-элементы карточек (HTMLDivElement)
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Словарь прямых ссылок на SVG-линии связей (SVGLineElement) по ключу "fromId-toId"
  const edgeRefs = useRef<Record<string, SVGLineElement | null>>({});

  // Инициализация стартовых координат для новых заметок:
  // расставляем карточки равномерно по окружности (центр: x=400, y=300, радиус: 180px).
  // Если координаты для заметки уже есть в coordsRef, не перезаписываем их при ререндере.
  notes.forEach((note, index) => {
    if (!coordsRef.current[note.id]) {
      const angle = (index / Math.max(notes.length, 1)) * Math.PI * 2;
      coordsRef.current[note.id] = {
        x: Math.round(400 + 180 * Math.cos(angle)),
        y: Math.round(300 + 180 * Math.sin(angle)),
      };
    }
  });

  // Хранит данные текущего перетаскивания (null, когда пользователь ничего не тянет)
  const dragRef = useRef<Drag | null>(null);

  // 1. Начало нажатия (мышью или пальцем на сенсорном экране)
  function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    noteId: string,
  ) {
    dragRef.current = {
      noteId: noteId,
      startX: event.clientX,
      startY: event.clientY,
      initialNodeX: coordsRef.current[noteId].x,
      initialNodeY: coordsRef.current[noteId].y,
      hasMoved: false,
    };
    // Захватываем указатель (Pointer Capture): теперь события move/up будут приходить в эту карточку,
    // даже если пользователь резко дернет мышью и курсор вылетит за пределы карточки.
    nodeRefs.current[noteId]?.setPointerCapture(event.pointerId);
  }

  // 2. Движение указателя (срабатывает каждый кадр при перетаскивании)
  function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>,
    noteId: string,
  ) {
    // Защита от чужих событий и мультитача (двигаем только захваченную карточку)
    if (!dragRef.current || !dragRef.current.noteId || dragRef.current.noteId !== noteId) return;
    if (!nodeRefs.current[noteId]) return;

    // Вычисляем смещение (дельту) от точки старта
    const dx = event.clientX - dragRef.current.startX;
    const dy = event.clientY - dragRef.current.startY;

    // Порог в 5 пикселей (Deadzone): защищает от случайного микродвижения руки при обычном клике
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.hasMoved = true;
    }

    const newX = dx + dragRef.current.initialNodeX;
    const newY = dy + dragRef.current.initialNodeY;

    // Сохраняем новые координаты в мутабельный ref (чтобы при следующем ререндере карточка не прыгнула назад)
    coordsRef.current[noteId].x = newX;
    coordsRef.current[noteId].y = newY;

    // Прямая мутация CSS transform через GPU-ускоренный translate3d (без setState и ререндера React)
    nodeRefs.current[noteId].style.transform =
      `translate3d(${newX}px, ${newY}px, 0)`;

    // Синхронно перетягиваем концы всех SVG-линий, привязанных к этой карточке.
    // Габариты карточки: ширина w-40 (160px) -> центр +80; высота h-12 (48px) -> центр +24.
    dependencies.forEach((dep) => {
      // Если линия выходит ИЗ перетаскиваемой карточки — двигаем её начало (x1, y1)
      if (dep.fromNoteId === noteId) {
        edgeRefs.current[`${dep.fromNoteId}-${dep.toNoteId}`]?.setAttribute(
          "x1",
          String(newX + 80),
        );
        edgeRefs.current[`${dep.fromNoteId}-${dep.toNoteId}`]?.setAttribute(
          "y1",
          String(newY + 24),
        );
      }
      // Если линия входит В перетаскиваемую карточку — двигаем её конец (x2, y2)
      if (dep.toNoteId === noteId) {
        edgeRefs.current[`${dep.fromNoteId}-${dep.toNoteId}`]?.setAttribute(
          "x2",
          String(newX + 80),
        );
        edgeRefs.current[`${dep.fromNoteId}-${dep.toNoteId}`]?.setAttribute(
          "y2",
          String(newY + 24),
        );
      }
    });
  }

  // 3. Отпускание кнопки мыши или пальца
  function handlePointerUp(
    event: React.PointerEvent<HTMLDivElement>,
    noteId: string,
  ) {
    if (!dragRef.current || !dragRef.current.noteId) return;
    nodeRefs.current[noteId]?.releasePointerCapture(event.pointerId);

    // Если карточка сдвинулась меньше чем на 5px — считаем это кликом и открываем заметку в редакторе
    if (!dragRef.current?.hasMoved) {
      setActiveNoteId(noteId);
      onChangeTab("editor");
    }

    // Очищаем состояние жеста
    dragRef.current = null;
  }

  // 4. Аварийная отмена жеста (например, системное уведомление на телефоне перехватило касание)
  function handlePointerCancel() {
    dragRef.current = null;
  }

  return (
    <>
      <div className="relative w-full h-full overflow-hidden bg-slate-50 select-none ">
        {/* Нижний слой: векторный холст для отрисовки линий связей (pointer-events-none пропускает клики сквозь себя к карточкам) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {dependencies.map((dep) => {
            const edgeKey = `${dep.fromNoteId}-${dep.toNoteId}`;
            const from = coordsRef.current[dep.fromNoteId] ?? { x: 0, y: 0 };
            const to = coordsRef.current[dep.toNoteId] ?? { x: 0, y: 0 };

            return (
              <line
                key={edgeKey}
                // Коллбэк-реф: сохраняем ссылку на живой DOM-узел <line> в словарь edgeRefs
                ref={(el) => {
                  edgeRefs.current[edgeKey] = el;
                }}
                x1={from.x + 80}
                y1={from.y + 24}
                x2={to.x + 80}
                y2={to.y + 24}
                stroke="#cbd5e1"
                strokeWidth="2"
              />
            );
          })}
        </svg>

        {/* Верхний слой: HTML-карточки заметок (touch-none отключает стандартный скролл браузера при перетаскивании пальцем) */}
        {notes.map((note) => (
          <div
            key={note.id}
            className="absolute top-0 left-0 w-40 h-12 bg-white border border-slate-200 rounded-xl shadow-sm px-3 flex items-center justify-center text-sm font-medium text-slate-700 truncate cursor-grab active:cursor-grabbing hover:border-indigo-400 transition-colors z-10 touch-none"
            style={{
              transform: `translate3d(${coordsRef.current[note.id].x}px, ${coordsRef.current[note.id].y}px, 0)`,
            }}
            // Коллбэк-реф: сохраняем ссылку на живой DOM-узел карточки в словарь nodeRefs
            ref={(el) => {
              nodeRefs.current[note.id] = el;
            }}
            onPointerDown={(e) => handlePointerDown(e, note.id)}
            onPointerMove={(e) => handlePointerMove(e, note.id)}
            onPointerUp={(e) => handlePointerUp(e, note.id)}
            onPointerCancel={handlePointerCancel}
          >
            {note.title}
          </div>
        ))}
      </div>
    </>
  );
};
