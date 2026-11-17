/* eslint-disable no-useless-escape */
// src/utils/mdLinks.ts

/**
 * Утилита-сканер для извлечения уникальных ID заметок из Markdown-текста.
 * Поддерживает форматы [[Название|note-id]] и [[note-id]].
 * Используется в useNotes.ts при пересчете связей графа (dependencies).
 */
export function extractLinks(text: string): string[] {
  const regex = /\[\[([^\[\]]+)\]\]/g;
  const matches = Array.from(text.matchAll(regex));

  const rawIds = matches
    .map((match) => {
      const content = match[1].trim();
      const pipeIndex = content.lastIndexOf("|");

      // Если есть разделитель "|", берем правую часть (ID), иначе всю строку целиком
      return pipeIndex !== -1 ? content.slice(pipeIndex + 1).trim() : content;
    })
    .filter(Boolean);

  // Гарантируем уникальность ID для графа связей и составного ключа в Supabase
  return Array.from(new Set(rawIds));
}

export interface LinkTriggerState {
  isOpen: boolean;
  query: string;
  startIndex: number; // Позиция символов "[[" в общем тексте
}

// Принимает полный текст и определяет, находится ли курсор прямо сейчас внутри незакрытой конструкции [[
export function getLinkTriggerState(
  text: string,
  cursorPos: number | null
): LinkTriggerState {
  if (cursorPos === null) {
    return { isOpen: false, query: "", startIndex: -1 };
  }

  // Берем только текст слева от курсора
  const textBeforeCursor = text.slice(0, cursorPos);

  // Где в последний раз открывалась ссылка ([[) и где закрывалась (]])
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
