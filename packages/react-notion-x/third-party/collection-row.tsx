import * as React from 'react';
import { PageBlock } from 'notion-types';

import { CollectionColumnTitle } from './collection-column-title';
import { Property } from './property';
import { useNotionContext } from '../context';
import { cs } from '../utils';
import { dateformat, hiddenPostProperties } from '~/lib/config';
import { getPostDate, isPostDateProperty } from '~/lib/post-date';

export const CollectionRow: React.FC<{
  block: PageBlock;
  pageHeader?: boolean;
  className?: string;
}> = ({ block, pageHeader = false, className }) => {
  const { recordMap } = useNotionContext();
  const collectionId = block.parent_id;
  const collection = recordMap.collection[collectionId]?.value;
  const schemas = collection?.schema;

  if (!collection || !schemas) {
    return null;
  }

  // Post dates remain visible on the blog even when the Notion property is hidden.
  const postDate = pageHeader ? getPostDate(block, collection, dateformat) : null;

  let propertyIds = Object.keys(schemas).filter(id => id !== 'title');

  // filter properties based on visibility
  if (collection.format?.property_visibility) {
    propertyIds = propertyIds.filter(
      id =>
        collection.format.property_visibility.find(({ property }) => property === id)
          ?.visibility !== 'hide',
    );
  }

  // sort properties
  if (collection.format?.collection_page_properties) {
    // sort properties based on collection page order
    const idToIndex = collection.format?.collection_page_properties.reduce(
      (acc, p, i) => ({
        ...acc,
        [p.property]: i,
      }),
      {},
    );

    propertyIds.sort((a, b) => idToIndex[a] - idToIndex[b]);
  } else {
    // default to sorting properties alphabetically based on name
    propertyIds.sort((a, b) => schemas[a].name.localeCompare(schemas[b].name));
  }

  // CUSTOM: 속성 필터링
  const properties = propertyIds
    .map(id => ({
      id,
      schema: schemas[id],
    }))
    .filter(
      ({ schema }) =>
        !hiddenPostProperties.includes(schema.name) && !(pageHeader && isPostDateProperty(schema)),
    );

  if (postDate) {
    const authorIndex = properties.findIndex(
      ({ schema }) => schema.type === 'person' || schema.type === 'created_by',
    );
    properties.splice(authorIndex + 1, 0, {
      id: 'blog-post-date',
      schema: { name: '작성일', type: 'date' },
    });
  }

  return (
    <div className={cs('notion-collection-row', className)}>
      <div className="notion-collection-row-body">
        {properties.map(({ id: propertyId, schema }) => {
          return (
            <div
              className={cs(
                'notion-collection-row-property',
                `notion-collection-property-type-${schema.type}`,
                propertyId === 'blog-post-date' && 'blog-post-date',
              )}
              key={propertyId}
            >
              <CollectionColumnTitle schema={schema} />

              <div className="notion-collection-row-value">
                {propertyId === 'blog-post-date' ? (
                  <time dateTime={postDate.dateTime} aria-label={`작성일 ${postDate.label}`}>
                    {postDate.label}
                  </time>
                ) : (
                  <Property
                    schema={schema}
                    data={block.properties?.[propertyId]}
                    propertyId={propertyId}
                    block={block}
                    collection={collection}
                    pageHeader={pageHeader}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
