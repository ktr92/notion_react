import type { Dependency, Note } from "../store/useNotes";

export interface HubInfo {
  note: Note;
  connectionsCount: number;
}

export interface GraphAnalytics {
  orphans: Note[];
  topHubs: HubInfo[];
}

export function analyzeKnowledgeGraph(
  notes: Note[],
  links: Dependency[],
): GraphAnalytics {
  const linkMap = new Map<string, number>();

  links.forEach((link) => {
    if (notes.find((n) => n.id === link.fromNoteId)) {
      const currentFromt = linkMap.get(link.fromNoteId) ?? 0;
      linkMap.set(link.fromNoteId, currentFromt + 1);
    }
    if (notes.find((n) => n.id === link.toNoteId)) {
      const currentTo = linkMap.get(link.toNoteId) ?? 0;
      linkMap.set(link.toNoteId, currentTo + 1);
    }
  });

  const orphans = notes.filter((n) => !linkMap.has(n.id));
  const topHubs = notes
    .filter((n) => linkMap.has(n.id))
    .sort((a, b) => (linkMap.get(b.id) ?? 0) - (linkMap.get(a.id) ?? 0))
    .slice(0, 3)
    .map((n) => ({ note: n, connectionsCount: linkMap.get(n.id) ?? 0 }));

  return {
    orphans,
    topHubs,
  };
}
