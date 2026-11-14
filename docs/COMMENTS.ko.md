# 노션 댓글 연결

블로그 글 하단의 댓글 기능을 사용합니다. 방문자는 로그인 없이 댓글을 작성하고, 댓글은 해당 노션 글에도 저장됩니다. 댓글 영역은 Posts와 Memo의 개별 글 하단에 표시됩니다.

## 1. 노션 내부 연결 만들기

1. [노션 개발자 포털](https://app.notion.com/developers/connections)을 엽니다.
2. 내부 연결(Internal connection)을 만들고 블로그가 있는 워크스페이스를 선택합니다. 이름은 `Blog comments`처럼 정하면 됩니다.
3. **Configuration → Capabilities**에서 **Read comments(댓글 읽기)**와 **Insert comments(댓글 삽입)**를 켜고 저장합니다.
4. Configuration의 **API token**을 복사합니다. 이 값은 GitHub나 채팅에 붙이지 않고 Vercel에 저장합니다.

## 2. 블로그 글에 접근 허용하기

연결의 **Content access**에서 Blog 페이지와 Posts·Memo의 원본 데이터베이스를 추가합니다.
노션 편집 화면의 페이지 오른쪽 위 **… → 연결(Connections)**에서 방금 만든 연결을 추가해도 됩니다.

Blog에 연결된 보기만 있고 실제 데이터베이스는 다른 곳에 있다면, 원본 데이터베이스에도 접근을 허용해야 합니다. 웹에 게시하는 설정과 API 연결의 접근 권한은 별도입니다.

## 3. Vercel에 토큰 저장하기

Vercel에서 블로그 프로젝트를 열고 **Settings → Environment Variables**에 추가합니다.

| 이름             | 값                         | 적용 환경           |
| ---------------- | -------------------------- | ------------------- |
| `NOTION_API_KEY` | 복사한 API token 값만 입력 | Production, Preview |

`Bearer `나 따옴표를 붙이지 않습니다. `NEXT_PUBLIC_` 접두사도 붙이지 않습니다.
로컬에서 실행할 때는 같은 변수를 `.env.local`에 넣습니다.

코드를 반영하고 환경 변수를 저장한 다음, **Deployments → 최신 배포 → Redeploy**로 다시 배포합니다.
이 저장소의 `site.config.ts`에서는 `enableComment: true`로 활성화해 두었습니다.

## 4. 확인하기

Posts 또는 Memo의 글을 열어 맨 아래 댓글 영역을 확인합니다. 통합 연결이 완료되면 입력창이 활성화됩니다.
등록된 댓글은 노션에서 같은 글을 열어 확인할 수 있습니다. 방문자의 댓글은 노션에서 통합이 작성한 댓글로 저장됩니다.

기존 API가 제공하는 해결되지 않은 댓글이 표시됩니다. 노션에서 해결 처리한 댓글은 목록에서 빠집니다.
한 댓글은 최대 2,000자이며, 댓글이 많으면 **댓글 더 보기**로 이어서 불러옵니다.

| 증상                         | 확인할 것                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------ |
| 댓글 영역이 없음             | 최신 코드가 배포됐는지, 홈이나 Memo 목록이 아닌 개별 글인지                          |
| ‘댓글 연결을 준비 중입니다.’ | `NOTION_API_KEY`, 토큰 값, Read/Insert comments 권한, Content access, 저장 후 재배포 |
| Posts는 되는데 Memo는 안 됨  | Memo 원본 데이터베이스가 연결에 공유됐는지                                           |
| 등록 실패                    | 작성 내용이 남아 있으므로 연결 상태를 확인하고 재시도                                |

설정 문제나 통신 오류는 댓글 목록이 비어 있는 것과 구분해서 표시됩니다. 인증 오류가 나도 글 본문은 계속 볼 수 있습니다.

공식 안내: [내부 연결](https://developers.notion.com/guides/connections-and-tokens/internal-connections) · [댓글 API](https://developers.notion.com/guides/data-apis/working-with-comments)
