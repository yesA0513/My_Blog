import * as React from 'react';
import cs from 'classnames';
import { IoSunnyOutline, IoMoonOutline } from 'react-icons/io5';
import { Breadcrumbs, Search, useNotionContext } from 'react-notion-x';
import * as types from 'notion-types';

import { useDarkMode } from 'lib/use-dark-mode';
import { navigationStyle, navigationLinks, isSearchEnabled, rootNotionPageId } from 'lib/config';
import { uuidToId } from 'notion-utils';

import { BackButton } from './BackButton';
import styles from './styles.module.css';

export const ToggleThemeButton = () => {
  const [hasMounted, setHasMounted] = React.useState(false);
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const showDarkMode = hasMounted && isDarkMode;

  return (
    <button
      type="button"
      className={cs('breadcrumb', 'button', 'blog-theme-button', !hasMounted && styles.hidden)}
      aria-label="다크 모드"
      aria-pressed={showDarkMode}
      title={showDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
      onClick={toggleDarkMode}
    >
      {showDarkMode ? (
        <IoMoonOutline aria-hidden="true" focusable="false" />
      ) : (
        <IoSunnyOutline aria-hidden="true" focusable="false" />
      )}
    </button>
  );
};

export const NotionPageHeader: React.FC<{
  block: types.CollectionViewPageBlock | types.PageBlock;
}> = ({ block }) => {
  const { components, mapPageUrl } = useNotionContext();
  const breadcrumbs = (
    <div className="blog-header-left">
      {uuidToId(block.id) !== rootNotionPageId && <BackButton />}
      <Breadcrumbs block={block} />
    </div>
  );

  if (navigationStyle === 'default') {
    return (
      <header className="notion-header">
        <div className="notion-nav-header">
          {breadcrumbs}
          <div className="blog-header-actions">
            <ToggleThemeButton />
            {isSearchEnabled && <Search block={block} title="검색" />}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="notion-header">
      <div className="notion-nav-header">
        {breadcrumbs}

        <div className="notion-nav-header-rhs breadcrumbs blog-header-actions">
          {navigationLinks
            ?.map((link, index) => {
              if ((!link.pageId && !link.url) || link.menuPage) {
                return null;
              }

              if (link.pageId) {
                return (
                  <components.PageLink
                    href={mapPageUrl(link.pageId)}
                    key={index}
                    className={cs(styles.navLink, 'breadcrumb', 'button', 'notion-nav-header-wide')}
                  >
                    {link.title}
                  </components.PageLink>
                );
              } else if (link.url) {
                return (
                  <components.Link
                    href={link.url}
                    key={index}
                    className={cs(styles.navLink, 'breadcrumb', 'button', 'notion-nav-header-wide')}
                  >
                    {link.title}
                  </components.Link>
                );
              }
            })
            .filter(Boolean)}

          <ToggleThemeButton />

          {isSearchEnabled && <Search block={block} title={null} />}

          {navigationLinks
            ?.map((link, index) => {
              if (!link.pageId && !link.url) {
                return null;
              }

              if (link.menuPage == true) {
                return (
                  <components.PageLink
                    href={mapPageUrl(link.pageId)}
                    key={index}
                    className={cs(
                      styles.navLink,
                      'breadcrumb',
                      'button',
                      'notion-nav-header-mobile',
                    )}
                  >
                    <svg
                      strokeWidth="0"
                      width="14px"
                      height="14px"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M0 0h24v24H0z" fill="none" />
                      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                    </svg>
                  </components.PageLink>
                );
              }
            })
            .filter(Boolean)}
        </div>
      </div>
    </header>
  );
};
