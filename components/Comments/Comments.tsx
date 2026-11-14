import * as React from 'react';
import { useState } from 'react';

import axios from 'axios';
import cs from 'classnames';
import { formatDistanceToNow } from 'date-fns';
import ko from 'date-fns/locale/ko';
import { useFormik } from 'formik';
import useSWRInfinite from 'swr/infinite';

import { ExtendedRecordMap } from '~/packages/notion-types';
import { LoadingIcon } from '../LoadingIcon';

interface CommentPage {
  results: {
    id: string;
    created_by?: { id: string };
    created_time: string;
    rich_text: { plain_text?: string; text?: { content?: string } }[];
  }[];
  has_more: boolean;
  next_cursor: string | null;
}

interface CommentsProps {
  pageId: string;
  recordMap: ExtendedRecordMap;
}

function errorMessage(error: unknown, fallback: string) {
  return axios.isAxiosError(error) && typeof error.response?.data?.message === 'string'
    ? error.response.data.message
    : fallback;
}

const Comments = ({ pageId, recordMap }: CommentsProps) => {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { data, error, mutate, size, setSize, isValidating } = useSWRInfinite<CommentPage>(
    (index, previous) => {
      if (index && (!previous?.has_more || !previous?.next_cursor)) return null;
      const endpoint = `/api/comments/${encodeURIComponent(pageId)}`;
      return index ? `${endpoint}?cursor=${encodeURIComponent(previous.next_cursor)}` : endpoint;
    },
    { shouldRetryOnError: false, revalidateOnFocus: false },
  );
  const isLoading = !data && !error;
  const loadingMore = !!data && data.length < size;
  const hasMore = !!data?.[data.length - 1]?.has_more;

  const formik = useFormik({
    initialValues: { content: '' },
    onSubmit: async values => {
      if (loading || isLoading || error || !values.content.trim()) return;
      setLoading(true);
      setSubmitError('');
      try {
        await axios.post(`/api/comments/${encodeURIComponent(pageId)}`, {
          content: values.content.trim(),
        });
        formik.resetForm();
        // A refresh failure after a successful write must not invite a duplicate post.
        await mutate().catch(() => undefined);
      } catch (error) {
        setSubmitError(errorMessage(error, '댓글을 등록하지 못했습니다. 다시 시도해 주세요.'));
      } finally {
        setLoading(false);
      }
    },
  });

  const comments = Array.from(
    new Map(
      (data || []).flatMap(page => page?.results || []).map(item => [item.id, item]),
    ).values(),
  ).map(item => {
    const user = recordMap.notion_user?.[item.created_by?.id]?.value || {
      id: 'guest',
      name: '익명',
      profile_photo: '/comment.png',
    };
    const createdAt = new Date(item.created_time);
    return {
      id: item.id,
      user,
      text: (item.rich_text || [])
        .map(part => part.plain_text ?? part.text?.content ?? '')
        .join(''),
      isOwner: user.id !== 'guest',
      createdAt: Number.isNaN(createdAt.getTime())
        ? ''
        : formatDistanceToNow(createdAt, { locale: ko, addSuffix: true }),
    };
  });

  return (
    <div className="notion-comments">
      <h2 className="notion-h notion-h1">댓글</h2>

      {isLoading && (
        <div className="comments-feedback" role="status" aria-label="댓글 불러오는 중">
          <LoadingIcon />
        </div>
      )}
      {error && (
        <div className="comments-feedback" role="alert">
          <span>{errorMessage(error, '댓글을 불러오지 못했습니다.')}</span>
          <button type="button" onClick={() => void mutate().catch(() => undefined)}>
            다시 불러오기
          </button>
        </div>
      )}

      <form className={cs('item', loading && 'loading')} onSubmit={formik.handleSubmit}>
        <img className="profileImage guest" src="/comment.png" alt="익명" />
        <div className="right">
          <div className="content">
            <div className="bg" />
            <textarea
              name="content"
              aria-label="댓글 내용"
              aria-describedby={submitError ? `comment-error-${pageId}` : undefined}
              placeholder="댓글을 입력하세요."
              rows={6}
              maxLength={2000}
              value={formik.values.content}
              disabled={loading || isLoading || !!error}
              onChange={event => {
                setSubmitError('');
                formik.handleChange(event);
              }}
            />
            <button
              type="submit"
              aria-label={loading ? '댓글 등록 중' : '댓글 등록'}
              aria-busy={loading}
              disabled={loading || isLoading || !!error || !formik.values.content.trim()}
            >
              {loading ? (
                <LoadingIcon className="comment-submit-loading" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                >
                  <path d="M16 2H8C4.691 2 2 4.691 2 8v12a1 1 0 0 0 1 1h13c3.309 0 6-2.691 6-6V8c0-3.309-2.691-6-6-6zm4 13c0 2.206-1.794 4-4 4H4V8c0-2.206 1.794-4 4-4h8c2.206 0 4 1.794 4 4v7z" />
                  <circle cx="9.5" cy="11.5" r="1.5" />
                  <circle cx="14.5" cy="11.5" r="1.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
      {submitError && (
        <p className="comments-feedback" id={`comment-error-${pageId}`} role="alert">
          {submitError}
        </p>
      )}

      <div className="items">
        {comments.map(item => (
          <div key={item.id} className={cs('item', item.isOwner && 'reverse')}>
            <img
              className={cs('profileImage', item.user.id === 'guest' && 'guest')}
              src={item.user.profile_photo || '/comment.png'}
              alt={item.user.name}
              onError={event => {
                if (!event.currentTarget.src.endsWith('/comment.png')) {
                  event.currentTarget.src = '/comment.png';
                }
              }}
            />
            <div className="right">
              <div className="content">
                <div className="bg" />
                <div className="texts">
                  {item.text.split('\n').map((text, i) => (
                    <React.Fragment key={i}>
                      {text}
                      <br />
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div className="profile">
                <div className="name">
                  {item.isOwner && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20.995 6.9a.998.998 0 0 0-.548-.795l-8-4a1.002 1.002 0 0 0-.895 0l-8 4a1.002 1.002 0 0 0-.547.795c-.011.107-.961 10.767 8.589 15.014a.987.987 0 0 0 .812 0c9.55-4.247 8.6-14.906 8.589-15.014zM12 19.897C5.231 16.625 4.911 9.642 4.966 7.635L12 4.118l7.029 3.515c.037 1.989-.328 9.018-7.029 12.264z" />
                      <path d="m11 12.586-2.293-2.293-1.414 1.414L11 15.414l5.707-5.707-1.414-1.414z" />
                    </svg>
                  )}
                  {item.user.name}
                </div>
                <div className="createdAt">{item.createdAt}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          className="comments-more"
          disabled={loadingMore || isValidating}
          onClick={() => void setSize(size + 1).catch(() => undefined)}
        >
          댓글 더 보기
        </button>
      )}
    </div>
  );
};

export default Comments;
