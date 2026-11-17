/* eslint-disable no-useless-escape */
// src/utils/mdParser.ts

export function parseMarkdown(
  text: string,
  notesTitlesMap?: Record<string, string>,
): string {
  // Экранируем HTML спецсимволы (защита от XSS)
  let html = text
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;");

  // Прячем многострочные блоки кода ```...``` в плейсхолдеры,
  // чтобы внутри них не сработали заголовки, жирный текст и <br />
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w*)\n([\s\(\S\)]*?)```/g, (_, lang, code) => {
    const cleanCode = code.replace(/\n$/, "");
    const block = `<pre class="bg-slate-900 text-slate-100 p-3.5 rounded-xl my-3 overflow-x-auto text-xs font-mono leading-relaxed"><code${
      lang ? ` class="language-${lang}"` : ""
    }>${cleanCode}</code></pre>`;
    codeBlocks.push(block);
    return `%%%CODEBLOCK_${codeBlocks.length - 1}%%%`;
  });

  // Прячем инлайн-код `...` в плейсхолдеры,
  // чтобы внутри него не парсились **жирный текст** и [[ссылки]]
  const inlineCodes: string[] = [];
  html = html.replace(/`([^`\n]+)`/g, (_, code) => {
    const inline = `<code class="bg-slate-100 text-indigo-600 px-1.5 py-0.5 rounded font-mono text-[13px] border border-slate-200/80">${code}</code>`;
    inlineCodes.push(inline);
    return `%%%INLINECODE_${inlineCodes.length - 1}%%%`;
  });

  // Парсим заголовки
  html = html.replaceAll(/^### ([^\n]*)(\n|$)/gm, "<h3>$1</h3>");
  html = html.replaceAll(/^## ([^\n]*)(\n|$)/gm, "<h2>$1</h2>");
  html = html.replaceAll(/^# ([^\n]*)(\n|$)/gm, "<h1>$1</h1>");

  // Парсим жирный текст
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Меняем оставшиеся \n на <br />
  html = html.replace(/\n/g, "<br />");

  // Парсим вики-ссылки: поддерживаем как новый формат [[Название|ID]], так и старый [[ID]]
  html = html.replaceAll(/\[\[([^\[\]]+)\]\]/gm, (_, rawContent: string) => {
    const trimmed = rawContent.trim();
    const pipeIndex = trimmed.lastIndexOf("|");

    let targetId = trimmed;
    let fallbackLabel = trimmed;

    if (pipeIndex !== -1) {
      fallbackLabel = trimmed.slice(0, pipeIndex).trim();
      targetId = trimmed.slice(pipeIndex + 1).trim();
    }

    // Если передан словарь актуальных названий { [id]: title }, берем свежее название оттуда
    const displayTitle =
      notesTitlesMap?.[targetId] || fallbackLabel || "Без названия";

    return `<button type="button" data-note-id="${targetId}" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium text-sm transition-colors cursor-pointer">${displayTitle}</button>`;
  });

  // Возвращаем инлайн-код и блоки кода на место
  html = html.replace(
    /%%%INLINECODE_(\d+)%%%/g,
    (_, index) => inlineCodes[Number(index)],
  );
  html = html.replace(
    /%%%CODEBLOCK_(\d+)%%%/g,
    (_, index) => codeBlocks[Number(index)],
  );

  return html;
}
