// src/utils/offlineStorage.ts
import type { Dependency, Note } from "../store/useNotes";

/**
 * Структура локального кэша (слепка данных пользователя).
 * Сохраняется в localStorage, чтобы при следующем открытии приложения
 * заметки и граф отрисовались за 0 мс, ещё до ответа от облака Supabase.
 */
export interface NotesCache {
  notes: Note[];
  dependencies: Dependency[];
  cachedAt: number; // Метка времени последнего сохранения кэша
}

/**
 * Описание одной отложенной задачи в очереди синхронизации (Outbox).
 * Используем Discriminated Union (размеченное объединение по полю `type`),
 * чтобы TypeScript точно знал, какие поля есть у каждого типа операции.
 */
export type OutboxItem =
  | {
      type: "CREATE_NOTE";
      note: Note; // Полный объект новой заметки, созданной в оффлайне
    }
  | {
      type: "UPDATE_NOTE";
      id: string;
      title?: string; // Передаём только если менялся заголовок
      content?: string; // Передаём только если менялся текст
      updatedAt: number;
      /**
       * Передаётся только при изменении content: содержит актуальный список
       * исходящих ссылок этой заметки, который нужно перезаписать в БД.
       */
      dependencies?: Dependency[];
    }
  | {
      type: "DELETE_NOTE";
      id: string; // ID заметки, которую нужно удалить на сервере
    };

// Генерируем уникальные ключи в localStorage для каждого пользователя.
// Это защищает от утечки данных, если на одном компьютере выйдут из одного аккаунта и войдут в другой.
const getCacheKey = (userId: string) => `notes_cache_${userId}`;
const getOutboxKey = (userId: string) => `notes_outbox_${userId}`;

/**
 * Читает сохранённый слепок заметок и связей из localStorage.
 * Возвращает null, если кэша ещё нет или данные в хранилище повреждены.
 */
export function loadNotesCache(userId: string): NotesCache | null {
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as NotesCache;
    // Защита от битого JSON: проверяем, что внутри действительно лежат массивы
    if (!Array.isArray(parsed.notes) || !Array.isArray(parsed.dependencies)) {
      return null;
    }
    return parsed;
  } catch {
    // Например, если в браузере отключён localStorage (режим инкогнито с жёсткими настройками)
    return null;
  }
}

/**
 * Перезаписывает локальный кэш актуальным состоянием из Zustand-стора.
 * Вызывается после каждой успешной загрузки с сервера и после каждого локального изменения.
 */
export function saveNotesCache(
  userId: string,
  notes: Note[],
  dependencies: Dependency[],
): void {
  try {
    const payload: NotesCache = {
      notes,
      dependencies,
      cachedAt: Date.now(),
    };
    localStorage.setItem(getCacheKey(userId), JSON.stringify(payload));
  } catch (error) {
    // Ловим QuotaExceededError (если пользователь загрузил мегабайты текста и память браузера кончилась)
    console.warn("Не удалось сохранить кэш заметок:", error);
  }
}

/**
 * Загружает список несинхронизированных операций (очередь Outbox) из localStorage.
 */
export function loadOutbox(userId: string): OutboxItem[] {
  try {
    const raw = localStorage.getItem(getOutboxKey(userId));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

/**
 * Сохраняет обновлённую очередь Outbox в localStorage.
 * Если очередь пустая — удаляем ключ целиком, чтобы не засорять хранилище.
 */
export function saveOutbox(userId: string, queue: OutboxItem[]): void {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(getOutboxKey(userId));
    } else {
      localStorage.setItem(getOutboxKey(userId), JSON.stringify(queue));
    }
  } catch (error) {
    console.warn("Не удалось сохранить очередь синхронизации:", error);
  }
}

/**
 * Чистая функция (без побочных эффектов): принимает текущую очередь и новую операцию,
 * а возвращает оптимизированную очередь.
 *
 * Зачем нужно "схлопывание" (Compaction):
 * Если пользователь без интернета 20 раз отредактировал одну заметку или создал и сразу удалил её,
 * нам не нужно отправлять на сервер 20 лишних запросов после появления сети.
 */
export function enqueueOutboxItem(
  queue: OutboxItem[],
  incoming: OutboxItem,
): OutboxItem[] {
  // СЛУЧАЙ 1: Создание новой заметки.
  // Её ещё не могло быть в очереди раньше, поэтому просто добавляем в конец (FIFO — первый пришёл, первый ушёл).
  if (incoming.type === "CREATE_NOTE") {
    return [...queue, incoming];
  }

  // СЛУЧАЙ 2: Обновление существующей заметки (заголовка или текста).
  if (incoming.type === "UPDATE_NOTE") {
    // Подслучай 2А: Эта заметка была создана в оффлайне и ещё НЕ ушла на сервер (в очереди есть её CREATE_NOTE).
    // Нет смысла отправлять сначала CREATE, а потом UPDATE — просто обновляем поля прямо внутри CREATE_NOTE!
    const createIdx = queue.findIndex(
      (item) => item.type === "CREATE_NOTE" && item.note.id === incoming.id,
    );

    if (createIdx !== -1) {
      return queue.map((item, idx) => {
        if (idx !== createIdx || item.type !== "CREATE_NOTE") return item;

        return {
          ...item,
          note: {
            ...item.note,
            // Обновляем только те поля, которые реально пришли в incoming (не затирая остальные на undefined)
            ...(incoming.title !== undefined ? { title: incoming.title } : {}),
            ...(incoming.content !== undefined
              ? { content: incoming.content }
              : {}),
            updatedAt: incoming.updatedAt,
          },
        };
      });
    }

    // Подслучай 2Б: Заметка уже есть на сервере, но в очереди уже лежит предыдущий несинхронизированный UPDATE_NOTE.
    // Склеиваем старый UPDATE и новый UPDATE в одну задачу (например, раньше поменяли title, а сейчас — content).
    const updateIdx = queue.findIndex(
      (item) => item.type === "UPDATE_NOTE" && item.id === incoming.id,
    );

    if (updateIdx !== -1) {
      return queue.map((item, idx) => {
        if (idx !== updateIdx || item.type !== "UPDATE_NOTE") return item;

        return {
          ...item,
          ...(incoming.title !== undefined ? { title: incoming.title } : {}),
          ...(incoming.content !== undefined
            ? { content: incoming.content }
            : {}),
          ...(incoming.dependencies !== undefined
            ? { dependencies: incoming.dependencies }
            : {}),
          updatedAt: incoming.updatedAt,
        };
      });
    }

    // Подслучай 2В: В очереди ещё нет задач для этой заметки — добавляем новый UPDATE_NOTE в конец.
    return [...queue, incoming];
  }

  // СЛУЧАЙ 3: Удаление заметки.
  if (incoming.type === "DELETE_NOTE") {
    // Проверяем, не была ли эта заметка создана в этом же оффлайн-сеансе.
    const wasCreatedOffline = queue.some(
      (item) => item.type === "CREATE_NOTE" && item.note.id === incoming.id,
    );

    // Вычищаем из очереди все упоминания об этой заметке (и CREATE_NOTE, и любые UPDATE_NOTE),
    // так как обновлять заметку перед её удалением бессмысленно.
    const cleaned = queue.filter((item) => {
      if (item.type === "CREATE_NOTE") return item.note.id !== incoming.id;
      if (item.type === "UPDATE_NOTE") return item.id !== incoming.id;
      return true;
    });

    // Если заметка была создана в оффлайне и удалена до выхода в сеть — сервер о ней вообще ничего не знает.
    // Возвращаем очищенную очередь без добавления DELETE_NOTE (операции взаимно аннигилировали!).
    if (wasCreatedOffline) {
      return cleaned;
    }

    // Если заметка уже существовала на сервере — ставим задачу DELETE_NOTE в конец очереди (с защитой от дубля).
    const alreadyDeleted = cleaned.some(
      (item) => item.type === "DELETE_NOTE" && item.id === incoming.id,
    );
    return alreadyDeleted ? cleaned : [...cleaned, incoming];
  }

  return queue;
}
