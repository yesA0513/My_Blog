import * as React from 'react';
import { useRouter } from 'next/router';
import { IoArrowBackOutline } from 'react-icons/io5';
import { blogNavigationHistory } from '../lib/navigation-history';

export const BackButton = () => {
  const router = useRouter();
  return (
    <button
      type="button"
      className="blog-back-button"
      title="이전 페이지로 돌아가기"
      onClick={() => {
        if (blogNavigationHistory.hasPrevious(window.history.state?.key)) router.back();
        else void router.push('/');
      }}
    >
      <IoArrowBackOutline aria-hidden="true" />
      <span>뒤로가기</span>
    </button>
  );
};
