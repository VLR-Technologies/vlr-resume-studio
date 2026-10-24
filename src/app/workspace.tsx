import type { ReactNode } from 'react';
import { WorkspaceContext } from './workspace-context';
import { useLiveQuery } from 'dexie-react-hooks';
import { repository } from '@/services/storage/repository';
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const data = useLiveQuery(
    () =>
      repository.database.transaction(
        'r',
        repository.database.profiles,
        repository.database.variants,
        async () => ({
          profiles: await repository.listProfiles(),
          variants: await repository.listVariants(),
        }),
      ),
    [],
  );
  if (!data)
    return (
      <div role="status" className="loading-state">
        Opening your local workspace…
      </div>
    );
  return (
    <WorkspaceContext.Provider value={data}>
      {children}
    </WorkspaceContext.Provider>
  );
}
