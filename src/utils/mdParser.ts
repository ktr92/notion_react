// src/utils/mdParser.ts

/**
 * Определяет выравнивание текста в колонке таблицы по строке-разделителю.
 * Примеры разделителей в Markdown:
 *   :---   -> влево (left)
 *   :---:  -> по центру (center)
 *   ---:   -> вправо (right)
 *   ---    -> по умолчанию влево (left)
 */
function parseAlignment(delimiterCell: string): "left" | "center" | "right" {
  const trimmed = delimiterCell.trim();
  const startsWithColon = trimmed.startsWith(":");
  const endsWithColon = trimmed.endsWith(":");

  if (startsWithColon && endsWithColon) return "center";
  if (endsWithColon) return "right";
  return "left";
}

/**
 * Разбивает одну строку Markdown-таблицы на массив очищенных ячеек.
 * Например: "| Имя | Возраст |" -> ["Имя", "Возраст"]
 */
function splitTableRow(row: string): string[] {
  const trimmed = row.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

/**
 * Находит в тексте GFM-таблицы (GitHub Flavored Markdown) и превращает их в HTML <table>.
 * Таблица обязана состоять минимум из 3 частей:
 *   1. Строка заголовков:   | Колонка 1 | Колонка 2 |
 *   2. Строка-разделитель:  | :---      | :---:     |
 *   3. Одна или более строк с данными
 */
function parseTables(text: string): string {
  const tableRegex =
    /^(\|?[^\n]+\|[^\n]+)\n(\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?)\n((?:\|?[^\n]+\|[^\n]*(?:\n|$))+)/gm;

  return text.replace(
    tableRegex,
    (_, headerLine: string, delimiterLine: string, bodyLines: string) => {
      const headers = splitTableRow(headerLine);
      const delimiters = splitTableRow(delimiterLine);

      const alignments = headers.map((_, idx) =>
        delimiters[idx] ? parseAlignment(delimiters[idx]) : "left",
      );

      const alignClassMap = {
        left: "text-left",
        center: "text-center",
        right: "text-right",
      };

      const theadHtml = headers
        .map(
          (header, idx) =>
            `<th class="px-3 py-2 font-semibold text-slate-700 bg-slate-50 border-b border-slate-200 ${alignClassMap[alignments[idx]]}">${header}</th>`,
        )
        .join("");

      const rows = bodyLines
        .trim()
        .split("\n")
        .map((line) => {
          const cells = splitTableRow(line);
          const tds = headers
            .map((_, idx) => {
              const cellContent = cells[idx] ?? "";
              return `<td class="px-3 py-2 text-slate-600 border-b border-slate-100 ${alignClassMap[alignments[idx]]}">${cellContent}</td>`;
            })
            .join("");
          return `<tr class="hover:bg-slate-50/60 transition-colors">${tds}</tr>`;
        })
        .join("");

      return `<div class="overflow-x-auto my-3 border border-slate-200 rounded-xl"><table class="w-full border-collapse text-sm"><thead><tr>${theadHtml}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
    },
  );
}

/**
 * Превращает подряд идущие строки списков и чек-листов в HTML-списки (<ul> / <ol>).
 * Порядок важен: сначала обрабатываем чекбоксы (- [ ] ...), так как они тоже начинаются с дефиса,
 * и только потом — обычные маркированные списки (- ...).
 */
function parseListsAndCheckboxes(text: string): string {
  // 1. Чекбоксы: строки вида "- [ ] Задача" или "- [x] Готово" (или со звёздочкой *)
  let result = text.replace(
    /^(?:[-*] \[( |x|X)\] [^\n]+(?:\n|$))+/gm,
    (block) => {
      const items = block
        .trim()
        .split("\n")
        .map((line) => {
          const isChecked = /^[-*] \[(x|X)\]/.test(line);
          const content = line.replace(/^[-*] \[( |x|X)\] /, "");
          return `<li class="flex items-start gap-2 my-1"><input type="checkbox" disabled ${
            isChecked ? "checked" : ""
          } class="mt-1 rounded border-slate-300 text-indigo-600" /><span class="${
            isChecked ? "line-through text-slate-400" : ""
          }">${content}</span></li>`;
        })
        .join("");
      return `<ul class="my-2 pl-1 list-none">${items}</ul>\n`;
    },
  );

  // 2. Маркированные списки: строки вида "- Пункт" или "* Пункт"
  result = result.replace(/^(?:[-*] [^\n]+(?:\n|$))+/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((line) => `<li class="my-0.5">${line.replace(/^[-*] /, "")}</li>`)
      .join("");
    return `<ul class="list-disc pl-5 my-2 space-y-0.5">${items}</ul>\n`;
  });

  // 3. Нумерованные списки: строки вида "1. Первый", "2. Второй"
  result = result.replace(/^(?:\d+\. [^\n]+(?:\n|$))+/gm, (block) => {
    const items = block
      .trim()
      .split("\n")
      .map((line) => `<li class="my-0.5">${line.replace(/^\d+\. /, "")}</li>`)
      .join("");
    return `<ol class="list-decimal pl-5 my-2 space-y-0.5">${items}</ol>\n`;
  });

  return result;
}

/**
 * Главная функция-конвейер преобразования Markdown-текста в безопасный HTML.
 *
 * Этапы конвейера:
 * 1. Экранирование HTML-тегов (защита от XSS-атак).
 * 2. Изоляция блоков кода и инлайн-кода в плейсхолдеры @@...@@, чтобы внутри них не сработало форматирование.
 * 3. Парсинг блочных элементов (разделители, заголовки, цитаты, таблицы, списки).
 * 4. Парсинг строчных (инлайн) элементов (жирный, курсив, зачёркнутый, внешние и вики-ссылки).
 * 5. Замена оставшихся переносов строк на <br /> (без лишних отступов после блоков).
 * 6. Возврат сохранённого кода на место плейсхолдеров.
 */
export function parseMarkdown(
  text: string,
  notesTitlesMap?: Record<string, string>,
): string {
  // ШАГ 1. Экранируем HTML-спецсимволы до любых преобразований
  let html = text
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;");

  // ШАГ 2. Прячем многострочные блоки кода ```lang ... ```
  // Используем маркеры вида @@CODEBLOCK:0@@ (без символов _ и *, чтобы их не задел парсер курсива)
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const cleanCode = code.replace(/\n$/, "");
    const block = `<pre class="bg-slate-900 text-slate-100 p-3.5 rounded-xl my-3 overflow-x-auto text-xs font-mono leading-relaxed"><code${
      lang ? ` class="language-${lang}"` : ""
    }>${cleanCode}</code></pre>`;
    codeBlocks.push(block);
    return `@@CODEBLOCK:${codeBlocks.length - 1}@@`;
  });

  // ШАГ 3. Прячем однострочный инлайн-код `...`
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    const inline = `<code class="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono text-[13px] border border-slate-200/80">${code}</code>`;
    inlineCodes.push(inline);
    return `@@INLINECODE:${inlineCodes.length - 1}@@`;
  });

  // ШАГ 4. Блочные элементы (выполняем строго ДО замены \n на <br />)

  // Горизонтальная линия-разделитель (--- или *** на отдельной строке)
  html = html.replace(
    /^(?:---|\*\*\*)\s*$/gm,
    '<hr class="my-4 border-slate-200" />',
  );

  // Заголовки H1, H2, H3
  html = html.replace(/^### ([^\n]*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## ([^\n]*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# ([^\n]*)$/gm, "<h1>$1</h1>");

  // Цитаты: на Шаге 1 символ ">" превратился в "&gt;", поэтому ищем строки, начинающиеся с "&gt;"
  html = html.replace(/^(?:&gt; ?[^\n]*(?:\n|$))+/gm, (block) => {
    const content = block
      .trim()
      .split("\n")
      .map((line) => line.replace(/^&gt; ?/, ""))
      .join("<br />");
    return `<blockquote class="border-l-4 border-indigo-400 pl-3.5 py-1.5 my-2.5 text-slate-600 bg-slate-50/80 rounded-r-lg italic">${content}</blockquote>\n`;
  });

  // Таблицы GFM
  html = parseTables(html);

  // Чек-листы, маркированные и нумерованные списки
  html = parseListsAndCheckboxes(html);

  // ШАГ 5. Строчные (инлайн) элементы

  // Жирный текст: **текст**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Курсив: *текст* или _текст_
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>");

  // Зачёркнутый текст: ~~текст~~
  html = html.replace(/~~(.+?)~~/g, '<del class="text-slate-400">$1</del>');

  // Внешние ссылки: [текст](https://example.com) — разрешаем только http/https для защиты от XSS
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-600 underline decoration-indigo-300 hover:decoration-indigo-600 underline-offset-2 font-medium break-all">$1 ↗</a>',
  );

  // Внутренние вики-ссылки: поддерживаем новый формат [[Название|ID]] и старый [[ID]]
  html = html.replaceAll(/\[\[([^\[\]]+)\]\]/gm, (_, rawContent: string) => {
    const trimmed = rawContent.trim();
    const pipeIndex = trimmed.lastIndexOf("|");

    let targetId = trimmed;
    let fallbackLabel = trimmed;

    if (pipeIndex !== -1) {
      fallbackLabel = trimmed.slice(0, pipeIndex).trim();
      targetId = trimmed.slice(pipeIndex + 1).trim();
    }

    const displayTitle =
      notesTitlesMap?.[targetId] || fallbackLabel || "Без названия";

    return `<button type="button" data-note-id="${targetId}" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium text-sm transition-colors cursor-pointer">${displayTitle}</button>`;
  });

  // ШАГ 6. Обработка переносов строк
  html = html.replace(
    /(<\/(?:h[1-3]|blockquote|ul|ol|div|pre)>|<hr[^>]*>)\n+/g,
    "$1",
  );
  html = html.replace(/\n/g, "<br />");

  // ШАГ 7. Возвращаем спрятанные блоки кода и инлайн-код на место плейсхолдеров
  html = html.replace(
    /@@INLINECODE:(\d+)@@/g,
    (_, index) => inlineCodes[Number(index)],
  );
  html = html.replace(
    /@@CODEBLOCK:(\d+)@@/g,
    (_, index) => codeBlocks[Number(index)],
  );

  return html;
}
