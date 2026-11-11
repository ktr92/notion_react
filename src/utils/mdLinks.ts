/* eslint-disable no-useless-escape */
// src/utils/mdLinks.ts

export function extractLinks(text: string): string[] {
  const regex = /\[\[([^\[\]]+)\]\]/g;
  const matches = Array.from(text.matchAll(regex));

  const rawIds = matches
    .map((match) => match[1].trim())
    .filter(Boolean);

  return Array.from(new Set(rawIds));
}
