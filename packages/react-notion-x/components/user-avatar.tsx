import * as React from 'react';
import { Block } from 'notion-types';

import { authorAvatarOverrides } from '~/lib/config';
import { useNotionContext } from '../context';

export const UserAvatar: React.FC<{
  userId: string;
  name: string;
  photoUrl?: string;
  block: Block;
}> = ({ userId, name, photoUrl, block }) => {
  const { mapImageUrl } = useNotionContext();
  const source = authorAvatarOverrides[userId] || (photoUrl && mapImageUrl(photoUrl, block));
  const [failedSource, setFailedSource] = React.useState<string | null>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    if (source && imageRef.current?.complete && !imageRef.current.naturalWidth) {
      setFailedSource(source);
    }
  }, [source]);

  if (source && failedSource !== source) {
    return (
      <img
        ref={imageRef}
        className="notion-user"
        src={source}
        alt=""
        aria-hidden="true"
        width={20}
        height={20}
        onError={() => setFailedSource(source)}
      />
    );
  }

  return (
    <span className="notion-user notion-user-fallback" aria-hidden="true">
      {Array.from(name.trim())[0]?.toUpperCase() || '?'}
    </span>
  );
};
