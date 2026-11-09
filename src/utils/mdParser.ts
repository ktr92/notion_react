export function parseMarkdown(text: string): string {
  text = text.replaceAll(/^### (.*$)/gm, "<h3>$1</h3>");
  text = text.replaceAll(/^## (.*$)/gm, "<h2>$1</h2>");
  text = text.replaceAll(/^# (.*$)/gm, "<h1>$1</h1>");

  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  text = text.replace(/\n/g, "<br />");

  return text;
}
