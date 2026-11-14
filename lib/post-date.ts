import { format, isValid, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import type { Block, Collection, CollectionPropertySchema } from 'notion-types';

const writingDateNames = new Set(['작성일', '작성일시', '작성날짜', '작성일자']);

export function isPostDateProperty(schema: CollectionPropertySchema) {
  return (
    schema.type === 'created_time' ||
    (schema.type === 'date' && writingDateNames.has(schema.name.replace(/\s/g, '')))
  );
}

export function getPostDate(
  block: Block,
  collection?: Pick<Collection, 'schema'>,
  dateFormat = 'yyyy년 MM월 dd일',
) {
  for (const [id, schema] of Object.entries(collection?.schema || {})) {
    if (schema.type !== 'date' || !isPostDateProperty(schema)) continue;
    const annotations = block.properties?.[id]?.[0]?.[1];
    if (!Array.isArray(annotations)) continue;
    const value = annotations.find(annotation => annotation[0] === 'd')?.[1];
    if (!value || typeof value !== 'object' || !('start_date' in value)) continue;
    const startDate = value.start_date;
    if (typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) continue;
    const date = parseISO(startDate);
    if (isValid(date)) return { dateTime: startDate, label: format(date, dateFormat) };
  }

  if (typeof block.created_time !== 'number' || !Number.isFinite(block.created_time)) return null;
  const created = new Date(block.created_time);
  if (!isValid(created)) return null;
  return {
    dateTime: created.toISOString(),
    label: formatInTimeZone(created, 'Asia/Seoul', dateFormat),
  };
}
