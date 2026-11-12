**My Blog — 노션으로 작성하는 블로그**

본인의 공개 노션 페이지를 연결해서 사용하는 Next.js 블로그입니다.

**처음 시작하기**

[내 노션으로 블로그 처음 설정하기](docs/SETUP.ko.md)를 순서대로 따라 하세요.
노션 페이지 만들기부터 웹 게시, GitHub 연결, Vercel 배포까지 설명되어 있습니다.

Vercel에 아래 환경 변수를 추가하면 됩니다.

| 변수                       | 값                                                                |
| -------------------------- | ----------------------------------------------------------------- |
| NEXT_PUBLIC_NOTION_PAGE_ID | 본인이 웹에 게시한 블로그 페이지의 원본 URL 또는 페이지 ID (필수) |
| NEXT_PUBLIC_SITE_NAME      | 블로그 이름 (선택)                                                |
| NEXT_PUBLIC_SITE_AUTHOR    | 작성자 이름 또는 닉네임 (선택)                                    |
| NEXT_PUBLIC_SITE_DOMAIN    | 직접 사용할 도메인, https:// 제외 (선택)                          |

기본 글 표시에는 Notion API 키가 필요하지 않습니다.
댓글과 별도 공유 이미지 기능은 처음에는 꺼져 있으며 나중에 설정할 수 있습니다.
페이지나 데이터베이스를 노션에서 웹에 게시해야 로그인하지 않은 방문자도 글을 읽을 수 있습니다.

**내 컴퓨터에서 실행하기**

Node.js 22를 사용하세요.

```sh
corepack yarn install --frozen-lockfile
cp .env.example .env.local
```

`.env.local`의 `NEXT_PUBLIC_NOTION_PAGE_ID`를 입력한 뒤 실행합니다.

```sh
corepack yarn dev
```

브라우저에서 `http://localhost:3000`을 여세요.
Windows에서는 파일 탐색기에서 `.env.example`을 복사해 `.env.local`로 이름을 바꿔도 됩니다.

**코드 확인하기**

| 위치                     | 역할                       |
| ------------------------ | -------------------------- |
| site.config.ts           | 블로그 설정과 기본값       |
| docs/SETUP.ko.md         | 처음부터 설정하는 안내     |
| packages/notion-client/  | 노션 데이터 조회           |
| packages/react-notion-x/ | 노션 페이지와 글 목록 표시 |
| styles/custom/           | 스타일 수정                |

```sh
corepack yarn test:notion
corepack yarn build
```

빌드할 때도 공개 노션 페이지 설정이 필요합니다.

**원본 프로젝트**

[2skydev/blog](https://github.com/2skydev/blog),
[transitive-bullshit/nextjs-notion-starter-kit](https://github.com/transitive-bullshit/nextjs-notion-starter-kit),
[react-notion-x](https://github.com/NotionX/react-notion-x)를 바탕으로 구성되어 있습니다.
