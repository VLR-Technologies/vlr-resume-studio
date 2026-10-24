import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { DataError } from '@/domain/validation';

// Invalid drafts survive SPA back/forward navigation in this tab; unload is guarded below.
const pendingDrafts = new Map<string, { draft: unknown; saved: unknown }>();
export function hasUnsavedDrafts() {
  return pendingDrafts.size > 0;
}
export function discardPendingDrafts(ids: string[]) {
  for (const id of ids) {
    pendingDrafts.delete(`profile:${id}`);
    pendingDrafts.delete(`variant:${id}`);
  }
}

/** Serialized writes, optimistic tokens, and an in-memory undo stack. No second persisted store. */
export function useAutosave<T extends { id: string; updatedAt: string }>(
  initial: T,
  save: (value: T, expected: string) => Promise<T>,
  namespace: 'profile' | 'variant',
) {
  const draftKey = `${namespace}:${initial.id}`;
  const [starting] = useState(() => pendingDrafts.get(draftKey));
  const [draft, setDraft] = useState<T>(() =>
    starting ? (starting.draft as T) : initial,
  );
  const [status, setStatus] = useState(
    starting ? 'Unsaved draft restored — review and save' : 'All changes saved',
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const state = useRef({
    draft,
    saved: starting ? (starting.saved as T) : initial,
    dirty: !!starting,
    busy: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    history: [] as T[],
  });
  const saveRef = useRef(save);
  const navigate = useNavigate();
  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  const flush = useCallback(
    async function savePending(): Promise<boolean> {
      const s = state.current;
      clearTimeout(s.timer);
      if (s.busy) return false;
      if (!s.dirty) return true;
      s.busy = true;
      const value = s.draft;
      setStatus('Saving…');
      try {
        const saved = await saveRef.current(value, s.saved.updatedAt);
        s.saved = saved;
        s.dirty = s.draft !== value;
        if (!s.dirty) {
          pendingDrafts.delete(draftKey);
          s.draft = saved;
          setDraft(saved);
        } else pendingDrafts.set(draftKey, { draft: s.draft, saved: s.saved });
        setErrors([]);
        setStatus(s.dirty ? 'Unsaved changes' : 'All changes saved');
        return true;
      } catch (error) {
        const details = error instanceof DataError ? error.details : [];
        setErrors([
          error instanceof Error ? error.message : 'Save failed.',
          ...details,
        ]);
        setStatus('Not saved — review errors');
        return false;
      } finally {
        s.busy = false;
        if (s.dirty && s.draft !== value)
          s.timer = setTimeout(() => void savePending(), 100);
      }
    },
    [draftKey],
  );
  function change(next: T, recordHistory = true) {
    const s = state.current;
    if (recordHistory) {
      // A short edit burst is one undo step, including entry deletion/reordering.
      if (!s.dirty || !s.timer) s.history.push(structuredClone(s.draft));
      s.history = s.history.slice(-30);
    }
    setUndoCount(s.history.length);
    s.draft = next;
    s.dirty = true;
    pendingDrafts.set(draftKey, { draft: next, saved: s.saved });
    setDraft(next);
    setStatus('Unsaved changes');
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      s.timer = undefined;
      void flush();
    }, 350);
  }
  function undo() {
    const previous = state.current.history.pop();
    if (previous)
      change({ ...previous, updatedAt: state.current.saved.updatedAt }, false);
  }
  function reload(value: T) {
    const s = state.current;
    if (s.busy) return;
    clearTimeout(s.timer);
    s.draft = value;
    s.saved = value;
    s.dirty = false;
    s.history = [];
    pendingDrafts.delete(draftKey);
    setDraft(value);
    setErrors([]);
    setUndoCount(0);
    setStatus('All changes saved');
  }
  useEffect(() => {
    const s = state.current;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (state.current.dirty || state.current.busy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const guardNavigation = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element ? event.target.closest('a') : null;
      if (
        !anchor ||
        anchor.target ||
        anchor.download ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.button !== 0 ||
        (!s.dirty && !s.busy)
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (url.origin !== location.origin || url.pathname === location.pathname)
        return;
      event.preventDefault();
      event.stopPropagation();
      void flush().then((ok) => {
        if (ok && !s.dirty && !s.busy)
          navigate(url.pathname + url.search + url.hash);
      });
    };
    document.addEventListener('click', guardNavigation, true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', guardNavigation, true);
      clearTimeout(s.timer);
      void flush();
    };
  }, [flush, navigate]);
  return { draft, change, undo, undoCount, status, errors, flush, reload };
}
