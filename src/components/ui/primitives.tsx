import {
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
export function Card({ className, ...props }: ComponentProps<'section'>) {
  return <section className={cn('card', className)} {...props} />;
}
export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn('badge', className)}>{children}</span>;
}
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon size={24} strokeWidth={1.5} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function TextLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowUpRight size={15} />
    </Link>
  );
}
export function Field({
  label,
  error,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {isValidElement<ComponentProps<'input'>>(children) && error
        ? cloneElement(children, {
            'aria-invalid': true,
            'aria-describedby': [
              children.props['aria-describedby'],
              `${htmlFor}-error`,
            ]
              .filter(Boolean)
              .join(' '),
          })
        : children}
      {error && (
        <span id={`${htmlFor}-error`} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
