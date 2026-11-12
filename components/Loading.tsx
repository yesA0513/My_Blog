import * as React from 'react';
import { LoadingIcon } from './LoadingIcon';

import styles from './styles.module.css';

export const Loading: React.FC = () => (
  <div className={styles.container} role="status" aria-label="불러오는 중">
    <LoadingIcon />
  </div>
);
