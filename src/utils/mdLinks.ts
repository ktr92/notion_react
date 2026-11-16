/* eslint-disable no-useless-escape */
// src/utils/mdLinks.ts

/**
 * Утилита-сканер для извлечения уникальных ID заметок из Markdown-текста.
 * Ищет все вхождения вики-ссылок формата [[note-id]].
 * Используется в useNotes.ts при пересчете связей графа (dependencies).
 */
export function extractLinks(text: string): string[] {
  // Регулярное выражение ищет двойные квадратные скобки [[...]].
  // Группа захвата ([^\[\]]+) берет любые символы внутри, кроме самих квадратных скобок
  // (защита от жадного захвата, если в одной строке написано сразу две ссылки: [[id1]] и [[id2]]).
  // Флаг 'g' (global) обязателен для работы метода matchAll.
  const regex = /\[\[([^\[\]]+)\]\]/g;

  // matchAll возвращает ленивый итератор всех совпадений с группами захвата,
  // оборачиваем его в Array.from, чтобы использовать привычные методы массивов (.map / .filter).
  const matches = Array.from(text.matchAll(regex));

  // match[0] — это вся найденная подстрока с квадратными скобками ("[[123]]"),
  // match[1] — это содержимое первой группы захвата ("123").
  // Очищаем случайные пробелы по краям (.trim()) и отбрасываем пустые скобки [[]] (.filter(Boolean)).
  const rawIds = matches
    .map((match) => match[1].trim())
    .filter(Boolean);

  // Оборачиваем результат в Set и снова превращаем в массив:
  // это гарантирует, что если пользователь 3 раза сослался на одну заметку в тексте,
  // в графе связей не появятся дублирующиеся линии и не упадет PRIMARY KEY в базе.
  return Array.from(new Set(rawIds));
}

export interface LinkTriggerState {
  isOpen: boolean;
  query: string;
  startIndex: number; // Позиция символов "[[" в общем тексте
}

// принимает полный текст и номер позиции курсора, а возвращает готовый объект с ответами на вопросы: открыто ли меню, какой сейчас поисковый запрос и с какого индекса нужно будет заменить текст при вставке.
export function getLinkTriggerState(
  text: string,
  cursorPos: number | null
): LinkTriggerState {
  if (cursorPos === null) {
    return { isOpen: false, query: "", startIndex: -1 };
  }

  // Берем только текст слева от курсора
  const textBeforeCursor = text.slice(0, cursorPos);

  const lastOpenIndex = textBeforeCursor.lastIndexOf("[[");
  const lastCloseIndex = textBeforeCursor.lastIndexOf("]]");

  // Если открывающих скобок нет или они уже закрыты до курсора — меню закрыто
  if (lastOpenIndex === -1 || lastOpenIndex < lastCloseIndex) {
    return { isOpen: false, query: "", startIndex: -1 };
  }

  // Текст, который пользователь успел набрать после "[["
  const queryAfterBrackets = textBeforeCursor.slice(lastOpenIndex + 2);

  // Если между "[[" и курсором есть перенос строки — считаем, что ссылка не завершена
  if (queryAfterBrackets.includes("\n")) {
    return { isOpen: false, query: "", startIndex: -1 };
  }

  return {
    isOpen: true,
    query: queryAfterBrackets.trim().toLowerCase(),
    startIndex: lastOpenIndex,
  };
}
