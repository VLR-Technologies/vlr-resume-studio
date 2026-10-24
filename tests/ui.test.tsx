import { beforeEach, afterAll, describe, it, expect } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '@/app/app';
import { db } from '@/services/storage/database';
import { useUi } from '@/app/ui-store';
beforeEach(async () => {
  await db.transaction(
    'rw',
    db.profiles,
    db.variants,
    db.revisions,
    async () => {
      await db.revisions.clear();
      await db.variants.clear();
      await db.profiles.clear();
    },
  );
  useUi.setState({ notice: null, pending: false });
});
afterAll(() => db.close());
function show(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}
describe('application integration', () => {
  it('renders an empty dashboard and navigates all main routes', async () => {
    const user = userEvent.setup();
    show();
    expect(
      await screen.findByRole('heading', {
        name: 'Your next chapter starts here.',
      }),
    ).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    await user.click(within(nav).getByRole('link', { name: 'Career Profile' }));
    expect(
      await screen.findByRole('heading', {
        name: 'Every career starts somewhere',
      }),
    ).toBeInTheDocument();
    await user.click(within(nav).getByRole('link', { name: 'My Resumes' }));
    expect(
      await screen.findByRole('heading', {
        name: 'Your next opportunity starts here',
      }),
    ).toBeInTheDocument();
    await user.click(within(nav).getByRole('link', { name: 'Settings' }));
    expect(
      await screen.findByRole('heading', { name: 'Stored on this browser' }),
    ).toBeInTheDocument();
  });
  it('creates a blank profile with no personal information', async () => {
    const user = userEvent.setup();
    show();
    await user.click(
      await screen.findByRole('button', { name: 'Create profile' }),
    );
    const dialog = screen.getByRole('dialog');
    await user.clear(within(dialog).getByLabelText('Profile name'));
    await user.type(
      within(dialog).getByLabelText('Profile name'),
      'My blank profile',
    );
    await user.click(
      within(dialog).getByRole('button', { name: 'Create blank profile' }),
    );
    expect(await screen.findByText('My blank profile')).toBeInTheDocument();
    const rows = await db.profiles.toArray();
    expect(rows[0]?.identity).toEqual({});
  });
  it('creates sample data, shows it after remount, and removes it with confirmation', async () => {
    const user = userEvent.setup();
    const first = show();
    await user.click(
      await screen.findByRole('button', { name: 'Try sample data' }),
    );
    expect(
      await screen.findByText('Alex Morgan · sample profile'),
    ).toBeInTheDocument();
    first.unmount();
    show('/resumes');
    expect(
      await screen.findByRole('heading', { name: 'AI Engineer Internship' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    await user.click(
      await screen.findByRole('button', { name: 'Remove sample data' }),
    );
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(await db.profiles.count()).toBe(1);
    await user.click(
      screen.getByRole('button', { name: 'Remove sample data' }),
    );
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', {
        name: 'Remove sample data',
      }),
    );
    await waitFor(async () => expect(await db.profiles.count()).toBe(0));
    expect(await db.variants.count()).toBe(0);
  });
  it('renders a functional not-found view', async () => {
    show('/does-not-exist');
    expect(
      await screen.findByRole('heading', {
        name: 'This page isn’t in your workspace.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Return to overview' }),
    ).toHaveAttribute('href', '/');
  });
});
