import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router';
import {
  LayoutDashboard,
  UserRound,
  Files,
  Settings2,
  ShieldCheck,
  ArrowUpRight,
  CheckCircle2,
  X,
  AlertCircle,
} from 'lucide-react';
import { ErrorBoundary } from '@/app/error-boundary';
import { WorkspaceProvider } from '@/app/workspace';
import { useUi } from '@/app/ui-store';
import { hasUnsavedDrafts } from '@/features/editor/use-autosave';
const navigation = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/profile', label: 'Career Profile', icon: UserRound },
  { to: '/resumes', label: 'My Resumes', icon: Files },
  { to: '/settings', label: 'Settings', icon: Settings2 },
];
export function AppShell() {
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const { notice, dismiss } = useUi();
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
    const label =
      navigation.find((n) => n.to === location.pathname)?.label ??
      (location.pathname.startsWith('/resumes/')
        ? 'Resume editor'
        : 'Page not found');
    document.title = `${label} · VLR Resume Studio`;
    main.current?.focus();
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div
      className={`app-shell ${location.pathname.startsWith('/resumes/') ? 'editor-shell' : ''}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Workspace navigation">
        <Link to="/" className="brand">
          <span className="brand-mark">
            VLR<span> /</span>
          </span>
          <span className="brand-name">
            Resume Studio<span>YOUR CAREER WORKSPACE</span>
          </span>
        </Link>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              aria-label={label}
              end={to === '/'}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={19} strokeWidth={1.7} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="private-note">
            <ShieldCheck size={21} />
            <strong>Private by design</strong>
            <p>Your story stays in your browser. You’re in control.</p>
            <Link to="/settings">
              About your data
              <ArrowUpRight size={13} />
            </Link>
          </div>
          <p className="attribution">
            A product by
            <br />
            <strong>VLR Technologies</strong>
          </p>
        </div>
      </aside>
      <div className="app-body">
        <header className="topbar">
          <span className="breadcrumb">
            Workspace<span>/</span>
            <strong>
              {navigation.find((n) => n.to === location.pathname)?.label ??
                (location.pathname.startsWith('/resumes/')
                  ? 'Resume editor'
                  : 'Not found')}
            </strong>
          </span>
          <span className="local-status">
            <span />
            Browser-local workspace
          </span>
        </header>
        <main
          id="main-content"
          className="main-content"
          ref={main}
          tabIndex={-1}
        >
          <ErrorBoundary key={location.pathname}>
            <WorkspaceProvider>
              <Outlet />
            </WorkspaceProvider>
          </ErrorBoundary>
        </main>
        <footer className="app-footer">
          <span>Built for your next chapter.</span>
          <span>
            <ShieldCheck size={13} />
            Local storage · No cloud sync
          </span>
        </footer>
      </div>
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
