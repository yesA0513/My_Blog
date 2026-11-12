import * as React from 'react';
import cs from 'classnames';
import styles from './LoadingIcon.module.css';

export const LoadingIcon: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  className,
  ...rest
}) => {
  return (
    <span className={cs(styles.dots, className)} aria-hidden="true" {...rest}>
      <span />
      <span />
      <span />
    </span>
  );
};
