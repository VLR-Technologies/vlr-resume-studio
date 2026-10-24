import { createContext, useContext } from 'react';
import type { MasterCareerProfile, ResumeVariant } from '@/domain/schemas';
export const WorkspaceContext = createContext<
  { profiles: MasterCareerProfile[]; variants: ResumeVariant[] } | undefined
>(undefined);
export function useWorkspace() {
  const data = useContext(WorkspaceContext);
  if (!data) throw new Error('Workspace provider is missing.');
  return data;
}
