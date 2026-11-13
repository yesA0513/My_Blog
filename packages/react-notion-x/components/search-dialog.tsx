import * as React from 'react';
import * as types from 'notion-types';
import throttle from 'lodash.throttle';
import { getBlockTitle, getBlockParentPage } from 'notion-utils';

import { SearchIcon } from '../icons/search-icon';
import { ClearIcon } from '../icons/clear-icon';
import { LoadingIcon } from '../icons/loading-icon';
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
              className="notion-search"
              overlayClassName="notion-search-overlay"
              onRequestClose={onClose}
              onAfterOpen={this._onAfterOpen}
            >
              <div className="quickFindMenu">
                <div className="searchBar">
                  <div className="inlineIcon">
                    {isLoading ? <LoadingIcon className="loadingIcon" /> : <SearchIcon />}
                  </div>

                  <input
                    className="searchInput"
                    role="searchbox"
                    aria-label="검색어"
                    placeholder="검색어를 입력하세요"
                    value={query}
                    ref={this._inputRef}
                    onChange={this._onChangeQuery}
                  />

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

                {hasQuery && searchResult && (
                  <>
                    {searchResult.results.length ? (
                      // @ts-ignore
                      <NotionContextProvider {...ctx} recordMap={searchResult.recordMap}>
                        <div className="resultsPane">
                          {searchResult.results.map(result => (
                            <components.PageLink
                              key={result.id}
                              className={cs('result', 'notion-page-link')}
                              href={mapPageUrl(result.page.id, searchResult.recordMap)}
                              onClick={onClose}
                            >
                              <PageTitle block={result.page} defaultIcon={defaultPageIcon} />

                              {result.highlight?.text && (
                                <div className="notion-search-result-highlight">
                                  {result.highlight.text}
                                </div>
                              )}
                            </components.PageLink>
                          ))}
                        </div>

                        <footer className="resultsFooter">
                          <div>
                            <span className="resultsCount">{searchResult.total}</span>

                            {'개 결과'}
                          </div>
                        </footer>
                      </NotionContextProvider>
                    ) : (
                      <div className="noResultsPane">
                        <div className="noResults" role="status">
                          검색 결과가 없습니다.
                        </div>
                        <div className="noResultsDetail">다른 검색어를 입력해 보세요.</div>
                      </div>
                    )}
                  </>
                )}

                {hasQuery && !searchResult && searchError && (
                  <div className="noResultsPane" role="alert">
                    <div className="noResults">검색을 불러오지 못했습니다.</div>
                    <div className="noResultsDetail">잠시 후 다시 시도해 주세요.</div>
                  </div>
                )}

                {hasQuery && isLoading && !searchResult && !searchError && (
                  <div className="noResultsPane" role="status">
                    검색 중입니다…
                  </div>
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
      this._inputRef.current.focus();
    }
  };

  _onChangeQuery = e => {
    const query = e.target.value;
    this._requestId++;
    this.setState({ query, isLoading: !!query.trim(), searchResult: null, searchError: null });

    if (!query.trim()) {
      this._search?.cancel();
      return;
    } else {
      this._search(query);
    }
  };

  _onClearQuery = () => {
    this._onChangeQuery({ target: { value: '' } });
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

    this.setState({ isLoading: true });
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

      if (this._mounted && this._requestId === requestId && this.state.query === query) {
        this.setState({ isLoading: false, searchResult, searchError });
      }
    } catch {
      if (this._mounted && this._requestId === requestId && this.state.query === query) {
        this.setState({ isLoading: false, searchResult: null, searchError: true });
      }
    }
  };
}
