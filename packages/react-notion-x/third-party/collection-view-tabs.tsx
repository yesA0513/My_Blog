import * as React from 'react';
import { CollectionView } from 'notion-types';

import { CollectionViewIcon } from '../icons/collection-view-icon';

export const CollectionViewTabs: React.FC<{
  views: CollectionView[];
  selectedViewId: string;
  title: string;
  panelId: string;
  onChange: (viewId: string) => void;
}> = ({ views, selectedViewId, title, panelId, onChange }) => {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = views.findIndex(view => view.id === selectedViewId);
    let next = current;

    switch (event.key) {
      case 'ArrowRight':
        next = (current + 1) % views.length;
        break;
      case 'ArrowLeft':
        next = (current - 1 + views.length) % views.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = views.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    onChange(views[next].id);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <div
      className="notion-collection-tabs"
      role="tablist"
      aria-label={`${title} 분류`}
      onKeyDown={onKeyDown}
    >
      {views.map(view => (
        <button
          key={view.id}
          id={`${panelId}-${view.id}`}
          type="button"
          role="tab"
          className="notion-collection-tab"
          aria-selected={view.id === selectedViewId}
          aria-controls={panelId}
          tabIndex={view.id === selectedViewId ? 0 : -1}
          onClick={() => onChange(view.id)}
        >
          <ViewIcon view={view} />
          <span>{view.name || view.type}</span>
        </button>
      ))}
    </div>
  );
};

function ViewIcon({ view }: { view: CollectionView }) {
  const icon = view.format?.collection_view_icon;
  const imageUrl =
    typeof icon === 'string' && icon.startsWith('/icons/')
      ? `https://app.notion.com${icon}`
      : typeof icon === 'string' && /^https?:\/\//.test(icon)
      ? icon
      : null;

  if (imageUrl) {
    return (
      <img
        className="notion-collection-tab-icon"
        src={imageUrl}
        alt=""
        aria-hidden="true"
        width={16}
        height={16}
        draggable={false}
      />
    );
  }

  if (typeof icon === 'string' && icon && !icon.startsWith('/')) {
    return <span aria-hidden="true">{icon}</span>;
  }

  return <CollectionViewIcon className="notion-collection-tab-icon" type={view.type} />;
}
