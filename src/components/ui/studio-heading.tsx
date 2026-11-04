import type { ReactNode } from 'react';

export function StudioHeading({
  title,
  description,
  trailing,
}: {
  title: string;
  description: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="panel-heading">
      <div>
        <h2>{title}</h2>
        {trailing}
      </div>
      <p>{description}</p>
    </header>
  );
}
