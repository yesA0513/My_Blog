import { RecordMap } from 'notion-types';

// Notion can return entries as { value: { value: record, role }, spaceId }.
// Keep the { value: record, role } shape used by the renderer and older responses.
export function normalizeRecordMap(recordMap: RecordMap): RecordMap {
  for (const table of Object.values(recordMap)) {
    if (!table || typeof table !== 'object' || Array.isArray(table)) continue;

    for (const entry of Object.values(table) as any[]) {
      while (
        entry?.value?.value &&
        typeof entry.value.value === 'object' &&
        typeof entry.value.role === 'string'
      ) {
        const { value, role } = entry.value;
        entry.value = value;
        entry.role = entry.role ?? role;
      }
    }
  }

  return recordMap;
}
