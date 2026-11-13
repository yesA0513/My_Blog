import * as React from 'react';
import * as types from 'notion-types';
import throttle from 'lodash.throttle';
import { getBlockTitle, getBlockParentPage } from 'notion-utils';

import { SearchIcon } from '../icons/search-icon';
import { ClearIcon } from '../icons/clear-icon';
import { PageTitle } from './page-title';
import { cs } from '../utils';
import { NotionContextConsumer, NotionContextProvider } from '../context';

// TODO: modal.default.setAppElement('.notion-viewport')

export class SearchDialog extends React.Component<{
  isOpen: boolean;
  rootBlockId: string;
  onClose: () => void;
  searchNotion: (params: types.SearchParams) => Promise<types.SearchResults>;
}> {
  constructor(props) {
    super(props);
    this._inputRef = React.createRef();
  }

  state = {
    isLoading: false,
    query: '',
    searchResult: null,
    searchError: null,
  };

  _inputRef: any;
  _search: any;
  _mounted = false;
  _requestId = 0;

  componentDidMount() {
    this._mounted = true;
    this._search = throttle(this._searchImpl.bind(this), 300);
    void this._warmupSearch();
  }

  componentWillUnmount() {
    this._mounted = false;
    this._requestId++;
    this._search?.cancel();
  }

  componentDidUpdate(previousProps) {
    if (this.props.isOpen && !previousProps.isOpen) void this._warmupSearch();
    if (!this.props.isOpen && previousProps.isOpen) {
      this._requestId++;
      this._search?.cancel();
    }
  }

  render() {
    const { isOpen, onClose } = this.props;
    const { isLoading, query, searchResult, searchError } = this.state;
    const hasQuery = !!query.trim();

    return (
      <NotionContextConsumer>
        {ctx => {
          const { components, defaultPageIcon, mapPageUrl } = ctx;
          return (
            <components.Modal
              isOpen={isOpen}
              contentLabel="블로그 검색"
              className={{
                base: 'notion-search',
                afterOpen: 'notion-search--open',
                beforeClose: 'notion-search--closing',
              }}
              overlayClassName={{
                base: 'notion-search-overlay',
                afterOpen: 'notion-search-overlay--open',
                beforeClose: 'notion-search-overlay--closing',
              }}
              bodyOpenClassName="blog-search-open"
              closeTimeoutMS={180}
              onRequestClose={onClose}
              onAfterOpen={this._onAfterOpen}
              onAfterClose={this._onAfterClose}
            >
              <div className="quickFindMenu">
                <div className="search-toolbar">
                  <div className="searchBar">
                    <span className="inlineIcon" aria-hidden="true">
                      <SearchIcon />
                    </span>
                    <input
                      className="searchInput"
                      role="searchbox"
                      aria-label="검색어"
                      placeholder="검색어 입력"
                      value={query}
                      ref={this._inputRef}
                      onChange={this._onChangeQuery}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <div className="search-input-actions">
                      {isLoading && (
                        <span className="search-loading-dots" aria-hidden="true">
                          <span />
                          <span />
                          <span />
                        </span>
                      )}
                      {query && (
                        <button
                          type="button"
                          aria-label="검색어 지우기"
                          className="clearButton"
                          onClick={this._onClearQuery}
                        >
                          <ClearIcon className="clearIcon" />
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="search-close"
                    aria-label="검색 닫기"
                    title="검색 닫기 (Esc)"
                    onClick={onClose}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="m6 6 12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>

                <div className={cs('search-body', hasQuery && 'search-body--active')}>
                  {!hasQuery ? null : isLoading ? (
                    <div className="search-skeletons" role="status" aria-label="검색 중입니다">
                      {[0, 1, 2].map(index => (
                        <div className="search-skeleton-row" key={index} aria-hidden="true">
                          <span className="search-skeleton-icon" />
                          <div className="search-skeleton-lines">
                            <div className="search-skeleton-line" />
                            <div className="search-skeleton-line" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchError ? (
                    <div className="search-state" role="alert">
                      <span className="search-state-icon" aria-hidden="true">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          style={{ fill: 'none' }}
                        >
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v6m0 3v1" />
                        </svg>
                      </span>
                      <p className="noResults">검색을 불러오지 못했습니다.</p>
                      <button type="button" className="search-retry" onClick={this._onRetrySearch}>
                        다시 시도
                      </button>
                    </div>
                  ) : searchResult?.results.length ? (
                    <NotionContextProvider {...ctx} recordMap={searchResult.recordMap}>
                      <div className="resultsPane" key={query}>
                        {searchResult.results.map((result, index) => (
                          <components.PageLink
                            key={result.id}
                            className={cs('result', 'notion-page-link')}
                            href={mapPageUrl(result.page.id, searchResult.recordMap)}
                            onClick={onClose}
                            style={{ '--result-order': Math.min(index, 5) } as React.CSSProperties}
                          >
                            <div className="search-result-main">
                              <PageTitle block={result.page} defaultIcon={defaultPageIcon} />
                              {result.highlight?.text && (
                                <div className="notion-search-result-highlight">
                                  {result.highlight.text}
                                </div>
                              )}
                            </div>
                            <svg
                              className="search-result-arrow"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M5 12h14m-5-5 5 5-5 5" />
                            </svg>
                          </components.PageLink>
                        ))}
                      </div>
                    </NotionContextProvider>
                  ) : (
                    <div className="search-state" role="status">
                      <span className="search-state-icon" aria-hidden="true">
                        <SearchIcon />
                      </span>
                      <p className="noResults">검색 결과가 없습니다.</p>
                    </div>
                  )}
                </div>

                {hasQuery && !isLoading && searchResult?.results.length > 0 && (
                  <footer className="resultsFooter">
                    <span>
                      <strong>{searchResult.total}</strong>개 결과
                    </span>
                    <span className="search-footer-hint">
                      <kbd>Esc</kbd> 닫기
                    </span>
                  </footer>
                )}
              </div>
            </components.Modal>
          );
        }}
      </NotionContextConsumer>
    );
  }

  _onAfterOpen = () => {
    if (this._inputRef.current) {
      this._inputRef.current.focus({ preventScroll: true });
    }
  };

  _onAfterClose = () => {
    if (!this._mounted) return;
    this._requestId++;
    this._search?.cancel();
    this.setState({ query: '', isLoading: false, searchResult: null, searchError: null });
  };

  _onChangeQuery = e => {
    const query = e.target.value;
    const requestId = ++this._requestId;
    this.setState(
      { query, isLoading: !!query.trim(), searchResult: null, searchError: null },
      () => {
        if (!this.props.isOpen || this._requestId !== requestId) return;
        if (query.trim()) this._search(query);
        else this._search?.cancel();
      },
    );
  };

  _onClearQuery = () => {
    this._inputRef.current?.focus({ preventScroll: true });
    this._onChangeQuery({ target: { value: '' } });
  };

  _onRetrySearch = () => {
    this._inputRef.current?.focus({ preventScroll: true });
    void this._searchImpl(this.state.query);
  };

  _warmupSearch = async () => {
    const { searchNotion, rootBlockId } = this.props;

    try {
      await searchNotion({ query: '', ancestorId: rootBlockId });
    } catch {
      // A warmup failure must not become an unhandled browser rejection.
      // An actual query displays the retry message below.
    }
  };

  _searchImpl = async (query: string) => {
    const { searchNotion, rootBlockId } = this.props;
    const requestId = ++this._requestId;

    if (!query.trim()) {
      this.setState({ isLoading: false, searchResult: null, searchError: null });
      return;
    }

    this.setState({ isLoading: true, searchResult: null, searchError: null });
    try {
      const result: any = await searchNotion({
        query,
        ancestorId: rootBlockId,
      });

      let searchResult: any = null; // TODO
      let searchError: types.APIError = null;

      if (
        result.error ||
        result.errorId ||
        !Array.isArray(result.results) ||
        !result.recordMap?.block
      ) {
        searchError = result;
      } else {
        searchResult = { ...result };

        const results = searchResult.results
          .map((result: any) => {
            const block = searchResult.recordMap.block[result.id]?.value;
            if (!block) return;

            const title = getBlockTitle(block, searchResult.recordMap);
            if (!title) {
              return;
            }

            result.title = title;
            result.block = block;
            result.recordMap = searchResult.recordMap;
            result.page =
              block.type === 'collection_view_page'
                ? block
                : getBlockParentPage(block, searchResult.recordMap, {
                    inclusive: true,
                  }) || block;

            if (!result.page.id) {
              return;
            }

            return result;
          })
          .filter(Boolean);

        // dedupe results by page id
        const searchResultsMap = results.reduce(
          (map, result) => ({
            ...map,
            [result.page.id]: result,
          }),
          {},
        );
        searchResult.results = Object.values(searchResultsMap);
      }

      if (
        this._mounted &&
        this.props.isOpen &&
        this._requestId === requestId &&
        this.state.query === query
      ) {
        this.setState({ isLoading: false, searchResult, searchError });
      }
    } catch {
      if (
        this._mounted &&
        this.props.isOpen &&
        this._requestId === requestId &&
        this.state.query === query
      ) {
        this.setState({ isLoading: false, searchResult: null, searchError: true });
      }
    }
  };
}
