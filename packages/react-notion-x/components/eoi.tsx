import * as React from 'react';
import { Block } from 'notion-types';

import { useNotionContext } from '../context';
import { cs, formatNotionDateTime } from '../utils';
import SvgTypeGitHub from '../icons/type-github';

// External Object Instance
export const EOI: React.FC<{
  block: Block;
  inline?: boolean;
  className?: string;
}> = ({ block, inline, className }) => {
  const { components } = useNotionContext();
  const { original_url, attributes } = block?.format || {};
  if (!original_url) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(original_url);
  } catch {
    return null;
  }

  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.hostname.toLowerCase().replace(/^www\./, '') !== 'github.com'
  ) {
    return null;
  }

  // Public Notion pages can expose the URL without integration-only attributes.
  const attribute = (id: string): string | undefined => {
    const entry = Array.isArray(attributes) ? attributes.find(attr => attr?.id === id) : null;
    const value = Array.isArray(entry?.values) ? entry.values[0] : null;
    return typeof value === 'string' && value.trim() ? value : undefined;
  };

  const [urlOwner, repository] = url.pathname.split('/').filter(Boolean);
  const title = attribute('title') || repository?.replace(/\.git$/, '') || urlOwner || 'GitHub';
  const owner = (attribute('owner') || urlOwner)?.split('/').filter(Boolean).pop();
  const lastUpdatedAt = Array.isArray(attributes)
    ? attributes.find(attr => attr?.id === 'updated_at')?.values?.[0]
    : undefined;
  const lastUpdated =
    lastUpdatedAt?.type === 'datetime' &&
    typeof lastUpdatedAt.start_date === 'string' &&
    Number.isFinite(Date.parse(lastUpdatedAt.start_date))
      ? formatNotionDateTime(lastUpdatedAt)
      : null;

  return (
    <components.Link
      target="_blank"
      rel="noopener noreferrer"
      href={url.href}
      className={cs(
        'notion-external',
        'notion-github-card',
        inline ? 'notion-external-mention' : 'notion-external-block notion-row',
        className,
      )}
    >
      <span className="notion-external-image" aria-hidden="true">
        <SvgTypeGitHub />
      </span>

      <span className="notion-external-description">
        <span className="notion-external-title">{title}</span>

        {(owner || lastUpdated) && (
          <span className="notion-external-subtitle">
            {owner && <span>{owner}</span>}
            {owner && lastUpdated && <span> • </span>}
            {lastUpdated && <span>Updated {lastUpdated}</span>}
          </span>
        )}
      </span>
      {!inline && (
        <span className="notion-github-open">
          GitHub에서 보기 <span aria-hidden="true">↗</span>
        </span>
      )}
    </components.Link>
  );
};
