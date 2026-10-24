import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';
import {
  useAutosave,
  hasUnsavedDrafts,
  discardPendingDrafts,
} from '@/features/editor/use-autosave';
import { newId } from '@/domain/factories';
import { DataError } from '@/domain/validation';
const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);
const ids: string[] = [];
function initial() {
  const id = newId();
  ids.push(id);
  return { id, updatedAt: '2026-10-24T10:00:00.000Z', name: '' };
}
afterEach(() => {
  vi.useRealTimers();
  discardPendingDrafts(ids.splice(0));
});
describe('autosave reliability', () => {
  it('serializes rapid edits during a delayed write and advances the optimistic token', async () => {
    vi.useFakeTimers();
    const p = initial();
    let release: (() => void) | undefined;
    const first = new Promise<void>((resolve) => {
      release = resolve;
    });
    const save = vi.fn(async (value: typeof p, expected: string) => {
      expect(expected).toMatch(/^2026-10-24/);
      if (save.mock.calls.length === 1) await first;
      return {
        ...value,
        updatedAt:
          save.mock.calls.length === 1
            ? '2026-10-24T10:00:01.000Z'
            : '2026-10-24T10:00:02.000Z',
      };
    });
    const view = renderHook(() => useAutosave(p, save, 'profile'), { wrapper });
    act(() => view.result.current.change({ ...p, name: 'A' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(view.result.current.status).toBe('Saving…');
    act(() => view.result.current.change({ ...p, name: 'AB' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => {
      release!();
      await first;
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]?.[1]).toBe('2026-10-24T10:00:01.000Z');
    expect(save.mock.calls[1]?.[0].name).toBe('AB');
    expect(view.result.current.status).toBe('All changes saved');
    expect(hasUnsavedDrafts()).toBe(false);
    view.unmount();
  });
  it('keeps failed edits, reports structured validation, and recovers an invalid draft after SPA remount', async () => {
    const p = initial();
    const save = vi.fn(async () => {
      throw new DataError('INVALID_DATA', 'Nothing was saved.', [
        'identity.email: Invalid email',
      ]);
    });
    const first = renderHook(() => useAutosave(p, save, 'profile'), {
      wrapper,
    });
    act(() => first.result.current.change({ ...p, name: 'Invalid draft' }));
    await act(async () => {
      await first.result.current.flush();
    });
    expect(first.result.current.errors).toContain(
      'identity.email: Invalid email',
    );
    expect(first.result.current.draft.name).toBe('Invalid draft');
    first.unmount();
    const reopened = renderHook(() => useAutosave(p, save, 'profile'), {
      wrapper,
    });
    expect(reopened.result.current.draft.name).toBe('Invalid draft');
    expect(reopened.result.current.status).toContain('Unsaved draft restored');
    act(() => reopened.result.current.reload(p));
    expect(hasUnsavedDrafts()).toBe(false);
    reopened.unmount();
  });
  it('restores deleted content with undo and isolates drafts even if record IDs coincide across tables', async () => {
    const p = initial();
    const save = vi.fn(async (v: typeof p) => ({
      ...v,
      updatedAt: '2026-10-24T10:00:01.000Z',
    }));
    const profile = renderHook(() => useAutosave(p, save, 'profile'), {
      wrapper,
    });
    act(() => profile.result.current.change({ ...p, name: 'Master only' }));
    const variant = renderHook(() => useAutosave(p, save, 'variant'), {
      wrapper,
    });
    expect(variant.result.current.draft.name).toBe('');
    act(() => profile.result.current.undo());
    expect(profile.result.current.draft.name).toBe('');
    await act(async () => {
      await profile.result.current.flush();
    });
    profile.unmount();
    variant.unmount();
  });
});
