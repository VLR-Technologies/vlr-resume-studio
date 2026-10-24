import { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataError } from '@/domain/validation';
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error)
      return (
        <section className="error-state" role="alert">
          <AlertCircle size={28} />
          <h1>We couldn’t open this view</h1>
          <p>
            {this.state.error instanceof DataError
              ? this.state.error.message
              : 'Something unexpected happened. Your local records have not been cleared.'}
          </p>
          <Button onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload workspace
          </Button>
        </section>
      );
    return this.props.children;
  }
}
