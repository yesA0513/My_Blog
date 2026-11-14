import * as React from 'react';
import { useState } from 'react';

import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import ko from 'date-fns/locale/ko';
import { useFormik } from 'formik';
import useSWRInfinite from 'swr/infinite';
import { UserAvatar } from 'react-notion-x/components/user-avatar';

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
      profile_photo: undefined,
    };
    const createdAt = new Date(item.created_time);
    return {
      id: item.id,
      user: { ...user, name: user.name?.trim() || '익명' },
      text: (item.rich_text || [])
        .map(part => part.plain_text ?? part.text?.content ?? '')
        .join(''),
      createdTime: Number.isNaN(createdAt.getTime()) ? undefined : createdAt.toISOString(),
      createdAt: Number.isNaN(createdAt.getTime())
        ? ''
        : formatDistanceToNow(createdAt, { locale: ko, addSuffix: true }),
    };
  });

  return (
    <section className="notion-comments" aria-labelledby={`comments-title-${pageId}`}>
      <h2 className="comments-title" id={`comments-title-${pageId}`}>
        댓글
      </h2>

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

      <form className="comments-composer" onSubmit={formik.handleSubmit} aria-busy={loading}>
        <textarea
          name="content"
          aria-label="댓글 내용"
          aria-describedby={submitError ? `comment-error-${pageId}` : undefined}
          placeholder="댓글을 입력하세요."
          rows={3}
          maxLength={2000}
          value={formik.values.content}
          disabled={loading || isLoading || !!error}
          onChange={event => {
            setSubmitError('');
            formik.handleChange(event);
          }}
        />
        <div className="comments-composer-actions">
          <button
            type="submit"
            className="comments-submit"
            aria-label={loading ? '댓글 등록 중' : '댓글 등록'}
            aria-busy={loading}
            disabled={loading || isLoading || !!error || !formik.values.content.trim()}
          >
            {loading && <LoadingIcon className="comment-submit-loading" />}
            <span>{loading ? '등록 중' : '등록'}</span>
          </button>
        </div>
      </form>
      {submitError && (
        <p
          className="comments-feedback comments-submit-error"
          id={`comment-error-${pageId}`}
          role="alert"
        >
          {submitError}
        </p>
      )}

      <ol className="comments-list">
        {comments.map(item => (
          <li key={item.id} className="comment-item">
            <span className="comment-avatar" aria-hidden="true">
              <UserAvatar
                userId={item.user.id}
                name={item.user.name}
                photoUrl={item.user.profile_photo}
                block={recordMap.block[pageId]?.value}
              />
            </span>
            <div className="comment-body">
              <div className="comment-meta">
                <span className="comment-author">{item.user.name}</span>
                {item.createdAt && <time dateTime={item.createdTime}>{item.createdAt}</time>}
              </div>
              <p className="comment-text">{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
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
    </section>
  );
};

export default Comments;
