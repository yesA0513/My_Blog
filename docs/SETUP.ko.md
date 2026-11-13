**내 노션으로 블로그 처음 설정하기**

이 안내는 이 파일과 함께 제공된 노션 연동 수정본을 기준으로 합니다.
GitHub에서 해당 변경을 `main` 브랜치에 반영한 뒤 진행하세요.
준비할 계정은 Notion, GitHub, Vercel 세 가지입니다.
기본 글 표시에는 Notion API 키가 필요하지 않습니다.

**1. 노션에 블로그 페이지 만들기**

노션에서 새 페이지를 만들고 제목을 `나의 블로그`로 정하세요.
페이지에 소개 문장 하나를 적고, 그 아래에 새 데이터베이스를 만드세요.
데이터베이스를 만들 때 보기 유형은 `갤러리`로 선택합니다.
다른 사람의 데이터베이스를 연결하는 보기 대신 본인 소유의 새 데이터베이스로 시작하세요.

데이터베이스에 `첫 번째 글`이라는 항목을 추가하고, 열어서 본문을 작성하세요.
처음에는 보기 필터를 모두 해제하세요. 글이 정상적으로 표시된 다음 공개 상태 필터를 추가하면 됩니다.

제목 속성은 `이름`으로 정하고, 원하면 아래 속성을 추가하세요.
이름과 순서는 나중에 변경할 수 있습니다.

| 속성 이름 | 노션 속성 유형 | 용도                                |
| --------- | -------------- | ----------------------------------- |
| 이름      | 제목           | 글 제목                             |
| 설명      | 텍스트         | 글 소개                             |
| 태그      | 다중 선택      | 글 분류                             |
| 작성일    | 생성 일시      | 작성 날짜                           |
| 상태      | 상태           | 나중에 공개할 글을 필터링할 때 사용 |

**2. 노션 페이지를 웹에 게시하기**

맨 위의 `나의 블로그` 페이지에서 `공유 → 게시 → 게시`를 선택하세요.
게시된 페이지 URL을 복사하고 시크릿 창에서 열어보세요.
로그인하지 않아도 소개 문장, 갤러리 목록, 첫 번째 글 본문까지 모두 보여야 합니다.
갤러리나 글에서 로그인 화면이 나오면 해당 데이터베이스 또는 글의 공유 권한도 확인하세요.

블로그로 공개할 내용만 이 페이지와 하위 페이지에 넣으세요.
노션의 웹 게시 범위와 데이터베이스 공개 동작은
[공식 게시 안내](https://www.notion.com/help/public-pages-and-web-publishing)에서 확인할 수 있습니다.

노션 URL에 페이지 ID가 들어 있다면 전체 URL을 설정에 그대로 사용해도 됩니다.
URL이 사용자 지정 짧은 주소라 ID가 보이지 않을 때는 노션 편집 화면의 `링크 복사`로 원본 링크를 복사하세요.

예를 들어 아래 주소에서 페이지 ID는 `0123456789abcdef0123456789abcdef`입니다.

```text
https://example.notion.site/My-Blog-0123456789abcdef0123456789abcdef
```

주소 뒤의 `?v=...` 값은 데이터베이스 보기 ID입니다. 이 값을 페이지 ID로 사용하지 마세요.

**3. Vercel에 GitHub 저장소 연결하기**

[Vercel](https://vercel.com/new)에 GitHub 계정으로 로그인하세요.
`Add New → Project`에서 `yesA0513/My_Blog`를 찾아 `Import`합니다.
기존 프로젝트 설정이 복잡하게 남아 있다면 새 프로젝트 이름으로 가져와서 진행할 수 있습니다.

| 설정               | 값                                 |
| ------------------ | ---------------------------------- |
| Framework Preset   | Next.js                            |
| Root Directory     | 저장소 최상위 (`./`)               |
| Production Branch  | main                               |
| Node.js Version    | 22.x                               |
| Install Command    | yarn install --frozen-lockfile     |
| Build Command      | yarn build                         |
| Output Directory   | Next.js 기본값 유지                |
| Ignored Build Step | Automatic / 별도 명령어 사용 안 함 |

노드 버전은 Vercel 프로젝트 설정의 `Build and Deployment`에서 변경할 수 있습니다.
[Vercel Node.js 안내](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)

**4. 환경 변수 입력하기**

배포 전 `Environment Variables`에 아래 값을 추가하세요.
기존 프로젝트라면 `Settings → Environment Variables`에서 추가합니다.
Production과 Preview에 적용하세요. Development는 로컬 개발을 할 때 함께 선택합니다.

| 변수 이름                  | 입력할 값                                                   |
| -------------------------- | ----------------------------------------------------------- |
| NEXT_PUBLIC_NOTION_PAGE_ID | 2단계에서 확인한 본인 블로그의 원본 노션 URL 또는 페이지 ID |
| NEXT_PUBLIC_SITE_NAME      | 블로그 이름 (예: 나의 개발 기록)                            |
| NEXT_PUBLIC_SITE_AUTHOR    | 표시할 작성자 이름 또는 닉네임                              |

필수 변수는 `NEXT_PUBLIC_NOTION_PAGE_ID` 하나입니다.
ID 대신 URL을 넣을 때도 원작자의 템플릿 주소가 아니라 본인이 만든 페이지 주소를 사용하세요.
값에 따옴표를 붙이지 마세요.

기본 Vercel 도메인은 자동으로 사용합니다.
직접 구매한 도메인을 연결하거나 자동으로 잡히지 않는 경우에는
`NEXT_PUBLIC_SITE_DOMAIN`에 `my-blog.vercel.app`처럼 호스트 이름만 추가하세요.
`https://`, `/`, 경로는 넣지 않습니다.

이 안내대로 처음 설정할 때는 `NOTION_API_KEY`, `NOTION_API_BASE_URL`,
`NEXT_PUBLIC_SITE_CONFIG`, Redis 환경 변수를 추가할 필요가 없습니다.
특히 이전 프로젝트의 `NEXT_PUBLIC_SITE_CONFIG` 값은 새 노션 설정을 덮어쓸 수 있습니다.
새 설정과 충돌하는 이전 값이 있는지 확인하세요.

노션 API의 기본 주소는 `https://app.notion.com/api/v3`입니다.
기존 `notion.so/api/v3` 환경 변수도 이 주소로 자동 변환합니다.
`page error ... HTTPError: Response code 403 (Forbidden)`으로 빌드가 실패하면
Vercel의 `NOTION_API_BASE_URL`에 예전 `www.notion.so` 주소가 남아 있는지 확인하세요.
해당 변수를 삭제해 기본값을 사용하거나, 값을 `https://app.notion.com/api/v3`로 바꾸고
적용 대상을 Production과 Preview 모두로 지정한 뒤 실패한 배포를 Redeploy하세요.
노션 API를 직접 호출하는 주소이므로 공개 노션 페이지 URL을 이 변수에 넣으면 안 됩니다.

본문 사진은 노션에서 발급한 서명된 파일 주소를 사용합니다.
새 노션 파일 주소와 기존 S3 파일 주소를 지원하며, 서명된 주소를 다시 이미지 프록시에 넣지 않습니다.

**5. 배포하고 첫 글 확인하기**

`Deploy`를 누르세요. 완료 후 `Visit`에서 블로그를 확인합니다.
`첫 번째 글` 카드가 보이고 클릭하면 본문이 나오는지 확인하세요.

환경 변수를 배포 후에 바꿨다면 `Deployments → Redeploy`로 다시 배포해야 적용됩니다.
노션에서 본문을 수정한 경우 사이트를 다시 방문하면 캐시 갱신 뒤 반영됩니다.
한 번 새로고침할 때 이전 글이 보일 수 있으니 잠시 뒤 한 번 더 확인하세요.
기존 글을 편집할 때마다 GitHub 커밋이나 수동 재배포를 할 필요는 없습니다.

**6. 글이 보인 다음 꾸미기**

노션에서 페이지 아이콘, 커버, 갤러리 카드 설정을 변경할 수 있습니다.
사이트 전체 설정은 `site.config.ts`, 스타일은 `styles/custom/`에서 변경합니다.
본문 폰트는 Pretendard이고 이모지는 Tossface를 사용합니다.
폰트 CSS 주소는 `pages/_document.tsx`, 글꼴 순서는 `styles/custom/vars.scss`의 `--notion-font`에서 변경합니다.
작성자 사진은 `public/author-avatar.png`를 교체하거나 `site.config.ts`의 `authorAvatarOverrides`에서 노션 사용자 ID에 해당하는 사진 주소를 바꾸면 됩니다.
노션에 사진이 없거나 이미지 로딩에 실패하면 이름의 첫 글자를 표시합니다.
페이지 이동 중에는 점 세 개 로딩 애니메이션이 표시되며, 스타일은 `components/LoadingIcon.module.css`에서 변경할 수 있습니다.
처음 설정에서는 원작자의 메뉴와 프로필 이미지를 제거했고 댓글 기능을 꺼두었습니다.

공개 상태로 글을 구분하고 싶으면 노션의 첫 번째 갤러리 보기에 필터를 추가하세요.
예를 들어 `상태 = 게시됨` 필터를 사용한다면 표시할 글도 `게시됨` 상태로 바꿔야 합니다.
필터는 글의 접근 권한을 보호하지 않습니다. 비공개 초안은 웹에 게시하지 않은 별도 페이지에 보관하세요.

Memo의 각 분류 보기에는 `상태 → Complete` 조건을 추가하세요.
현재 Memo 데이터베이스에서 이 그룹에 해당하는 상태는 `게시됨`입니다.
`초안`, `작성 중`, 상태가 비어 있는 글은 목록에 나오지 않습니다.
분류 조건과 상태 조건은 함께 적용되며, 노션의 피드 보기는 블로그에서 목록으로 표시됩니다.
블로그에서 숨길 보기 ID는 `site.config.ts`의 `hiddenCollectionViewIds`에서 지정합니다.
현재 Memo의 `All` 보기는 이 설정으로 숨겼으며, 노션에서는 계속 사용할 수 있습니다.

댓글과 별도 공유 이미지 기능을 사용하려면 나중에 공식 Notion 통합을 만들고,
대상 페이지에 접근 권한을 부여한 뒤 `NOTION_API_KEY`를 서버 환경 변수에 추가하세요.
`site.config.ts`에서 댓글은 `enableComment`, 별도 공유 이미지는 `isSocialImageEnabled`를 `true`로 바꿔 활성화합니다.
API 키에는 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.

**문제가 생겼을 때**

| 증상                                   | 먼저 확인할 것                                                            |
| -------------------------------------- | ------------------------------------------------------------------------- |
| NEXT_PUBLIC_NOTION_PAGE_ID 오류        | 환경 변수 오타, 값이 비었는지, 저장 후 재배포했는지                       |
| Notion page not found / 로그인 화면    | 노션 페이지 ID와 웹 게시 상태, 시크릿 창에서 접근 가능한지                |
| 화면은 뜨는데 글 목록이 없음           | 글 데이터베이스가 같은 페이지에 있는지, 갤러리 필터와 웹 공개 여부        |
| 다른 사람의 블로그가 표시됨            | main에 수정본이 반영됐는지, 이전 NEXT_PUBLIC_SITE_CONFIG 값이 남았는지    |
| 배포가 건너뛰어짐                      | Production Branch가 main인지, Ignored Build Step에 이전 명령어가 남았는지 |
| 이름이나 연결 페이지를 바꿔도 그대로임 | 환경 변수 적용 대상이 Production인지, 변경 후 Redeploy했는지              |

**내 컴퓨터에서 실행하려는 경우**

Node.js 22와 Git을 설치하고 터미널에서 실행하세요.

```sh
git clone https://github.com/yesA0513/My_Blog.git
cd My_Blog
corepack yarn install --frozen-lockfile
cp .env.example .env.local
```

`.env.local`에서 `NEXT_PUBLIC_NOTION_PAGE_ID`를 입력한 다음 실행합니다.

```sh
corepack yarn dev
```

브라우저에서 `http://localhost:3000`을 여세요.
Windows에서 `cp` 명령어가 안 되면 파일 탐색기에서 `.env.example`을 복사해 `.env.local`로 이름을 바꾸면 됩니다.
로컬 환경 변수를 바꿨을 때는 개발 서버를 종료하고 다시 실행하세요.
