import Dexie, { type Table } from 'dexie';
import type {
  MasterCareerProfile,
  ResumeRevision,
  ResumeVariant,
} from '@/domain/schemas';
export class StudioDatabase extends Dexie {
  profiles!: Table<MasterCareerProfile, string>;
  variants!: Table<ResumeVariant, string>;
  revisions!: Table<ResumeRevision, string>;
  constructor(name = 'vlr-resume-studio') {
    super(name);
    this.version(1).stores({
      profiles: 'id, updatedAt',
      variants: 'id, sourceProfileId, updatedAt',
      revisions: 'id, variantId, createdAt',
    });
  }
}
export const db = new StudioDatabase();
