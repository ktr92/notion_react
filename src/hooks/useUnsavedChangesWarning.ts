import { useEffect, useRef } from "react";

export function useUnsavedChangesWarning(hasUnsavedChanges: boolean): void {
  const hasUnsavedRef = useRef(hasUnsavedChanges);

  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const beforeunload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", beforeunload);

    return () => window.removeEventListener("beforeunload", beforeunload);
  }, []);
}
