import { extractLinks } from "./mdLinks";

export interface NoteStats {
  wordsCount: number;
  charsCount: number;
  readingTimeMinutes: number;
  linksCount: number;
}
const READ_TIME = 200;

export function getNoteStats(markdownText: string): NoteStats {
  const filteredLinks = extractLinks(markdownText);

  const cleanedText = markdownText
    .replaceAll(/\[\[([^[\]]+)\|([^[\]]+)\]\]/gm, "$1")
    .replaceAll(/\[\[([^[\]]+)\]\]/gm, "")
    .replaceAll(/^#{1,6}\s+/gm, "")
    .replaceAll("**", "");

  const wordsCount = cleanedText
    .split(/\s+/gm)
    .filter((w) => w.length > 0).length;

  const charsCount = cleanedText.replaceAll(/\s+/gm, "").length;

  return {
    wordsCount,
    charsCount,
    readingTimeMinutes: Math.ceil(wordsCount / READ_TIME),
    linksCount: filteredLinks.length,
  };
}
