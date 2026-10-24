import type { ReactNode } from 'react';
import { WorkspaceContext } from './workspace-context';
import { useLiveQuery } from 'dexie-react-hooks';
import { repository, storageError } from '@/services/storage/repository';
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const data = useLiveQuery(async () => {
    try {
      if (!repository.database.isOpen()) await repository.database.open();
      return await repository.database.transaction(
        'r',
        repository.database.profiles,
        repository.database.variants,
        async () => ({
          profiles: await repository.listProfiles(),
          variants: await repository.listVariants(),
        }),
      );
    } catch (error) {
      throw storageError(error);
    }
  }, []);
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
