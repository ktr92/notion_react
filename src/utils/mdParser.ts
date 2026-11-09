export function parseMarkdown(text: string): string {
  // Экранируем HTML спецсимволы
  let html = text
    .replaceAll(/&/g, "&amp;")
    .replaceAll(/</g, "&lt;")
    .replaceAll(/>/g, "&gt;");

  // Парсим заголовки
  // Ищем символы до конца строки [^\n]*, а перенос (\n|$) съедаем при замене!
  html = html.replaceAll(/^### ([^\n]*)(\n|$)/gm, "<h3>$1</h3>");
  html = html.replaceAll(/^## ([^\n]*)(\n|$)/gm, "<h2>$1</h2>");
  html = html.replaceAll(/^# ([^\n]*)(\n|$)/gm, "<h1>$1</h1>");

  // Парсим жирный текст
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Безопасно меняем оставшиеся \n на <br />
  // Теперь здесь нет переносов внутри или после заголовков
  html = html.replace(/\n/g, "<br />");

  return html;
}
