import { BrowserRouter, Link, Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/app-shell';
import { Dashboard } from './dashboard';
import { ProfilePage } from '@/features/career-profile/profile-page';
import { ResumesPage } from '@/features/resumes/resumes-page';
import { SettingsPage } from '@/features/settings/settings-page';
import { ErrorBoundary } from './error-boundary';
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="resumes" element={<ResumesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="*"
          element={
            <section className="not-found">
              <p className="eyebrow">404 · A SMALL DETOUR</p>
              <h1>This page isn’t in your workspace.</h1>
              <p>Your next chapter is still right where you left it.</p>
              <Link to="/" className="text-link">
                Return to overview
              </Link>
            </section>
          }
        />
      </Route>
    </Routes>
  );
}
export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
