import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router';
import { Settings2, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { ErrorBoundary } from '@/app/error-boundary';
import { WorkspaceProvider } from '@/app/workspace';
import { useUi } from '@/app/ui-store';
import { hasUnsavedDrafts } from '@/features/editor/use-autosave';
export function AppShell() {
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const { notice, dismiss } = useUi();
  const editing = location.pathname.startsWith('/resumes/');
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (hasUnsavedDrafts()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, []);
  useEffect(() => {
    document.title = `${editing ? 'Editor' : location.pathname === '/profile' ? 'Career Profile' : location.pathname === '/settings' ? 'Advanced Settings' : 'My Resumes'} · Perfect Tie`;
    main.current?.focus();
    window.scrollTo(0, 0);
  }, [location.pathname, editing]);
  return (
    <div className={`flow-shell ${editing ? 'flow-editing' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {!editing && (
        <header className="workspace-header">
          <Link to="/" className="vlr-brand">
            <img
              className="brand-wordmark"
              src="/brand/logo-light.svg"
              alt="Perfect Tie"
              width="176"
              height="47"
            />
          </Link>
          <nav aria-label="Main navigation">
            <NavLink
              to="/resumes"
              className={({ isActive }) =>
                isActive || location.pathname === '/' ? 'active' : ''
              }
            >
              My Resumes
            </NavLink>
            <NavLink to="/profile">Career Profile</NavLink>
            <NavLink to="/settings" aria-label="Advanced Settings">
              <Settings2 size={16} />
              <span>Advanced Settings</span>
            </NavLink>
          </nav>
        </header>
      )}
      <main id="main-content" className="main-content" ref={main} tabIndex={-1}>
        <ErrorBoundary key={location.pathname}>
          <WorkspaceProvider>
            <Outlet />
          </WorkspaceProvider>
        </ErrorBoundary>
      </main>
      <div
        className="notification-region"
        aria-live="polite"
        aria-atomic="true"
      >
        {notice && (
          <div
            className={`notification ${notice.error ? 'notification-error' : ''}`}
            role={notice.error ? 'alert' : 'status'}
          >
            {notice.error ? (
              <AlertCircle size={20} />
            ) : (
              <CheckCircle2 size={20} />
            )}
            <p>{notice.text}</p>
            <button onClick={dismiss} aria-label="Dismiss notification">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
