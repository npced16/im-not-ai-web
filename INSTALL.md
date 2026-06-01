# 설치 가이드 (Install)

Humanize KR은 **Claude Code**와 **OpenAI Codex CLI** 양쪽에서 전역으로 쓸 수 있습니다.

| 도구 | 모드 | 설치 방법 |
|---|---|---|
| Claude Code | Fast + strict(5인 파이프라인) | ① 플러그인 마켓플레이스(권장) / ② 클론 + `install.sh` |
| Codex CLI | Fast(단일 호출)만 | 클론 + `install.sh` |

> Codex는 Claude식 다중 서브에이전트 파이프라인을 결정적으로 실행하지 못해, 단일 호출 Fast Path만 제공합니다. 정밀 검증이 필요하면 Claude Code의 `--strict`를 사용하세요.

---

## Claude Code

### 방법 ① 플러그인 마켓플레이스 — 클론 불필요 (권장)

Claude Code 세션에서:

```
/plugin marketplace add epoko77-ai/im-not-ai
/plugin install humanize-korean@im-not-ai
```

- 설치 후 새 세션에서 `/humanize-korean`(또는 `/humanize`, `/humanize-redo`), 혹은 자연어 트리거("이 글 AI 티 없애줘")로 발동.
- 업데이트: `/plugin marketplace update im-not-ai` 후 `/plugin update humanize-korean`.
- 제거: `/plugin uninstall humanize-korean`.
- 구성요소: 스킬 3개(humanize-korean·humanize·humanize-redo) + 서브에이전트 12개가 함께 설치됩니다.

### 방법 ② 클론 + 스크립트

```bash
git clone https://github.com/epoko77-ai/im-not-ai.git
cd im-not-ai
./install.sh --claude-only
```

`~/.claude/skills/`에 스킬 3개, `~/.claude/agents/`에 에이전트 12개를 **심링크**합니다(저장소를 수정하면 즉시 반영). 새 세션에서 `/humanize-korean`.

---

## Codex CLI

Codex 0.121.0 이상(1급 Skills 지원)이 필요합니다.

```bash
git clone https://github.com/epoko77-ai/im-not-ai.git
cd im-not-ai
./install.sh --codex-only
```

`~/.codex/skills/humanize-korean`에 Fast Path 스킬을 심링크합니다. Codex에서 `$humanize-korean`으로 발동하거나, `/skills` 메뉴에서 선택하세요.

---

## 한 번에 양쪽 모두

```bash
git clone https://github.com/epoko77-ai/im-not-ai.git
cd im-not-ai
./install.sh            # 설치된 claude/codex를 자동 감지해 각각 연결
```

### `install.sh` 옵션

| 옵션 | 설명 |
|---|---|
| (없음) | `claude`·`codex` 자동 감지 후 각각 설치 (심링크) |
| `--copy` | 심링크 대신 복사. 저장소를 지워도 유지(references 심링크는 실체화). ⚠ 복사본은 `uninstall.sh`가 자동 삭제하지 않음 |
| `--claude-only` / `--codex-only` | 한쪽만 |
| `--force` | 대상에 일반 파일/디렉토리가 있어도 `.bak.<ts>`로 백업 후 덮어씀 |
| `--dry-run` | 실제 변경 없이 수행할 작업만 출력 |
| `-h`, `--help` | 도움말 |

환경변수 `CLAUDE_HOME`(기본 `~/.claude`), `CODEX_HOME`(기본 `~/.codex`)로 설치 위치를 바꿀 수 있습니다.

---

## 업데이트 · 제거

- **업데이트(스크립트 설치)**: 심링크라 저장소에서 `git pull`만 하면 됩니다(`--copy` 설치는 `./install.sh --copy` 재실행).
- **제거(스크립트 설치)**: `./uninstall.sh` — 이 저장소를 가리키는 심링크만 제거하고, 직접 둔 파일·`.bak.*` 백업은 보존합니다.
- **제거(마켓플레이스)**: `/plugin uninstall humanize-korean`.

---

## 트러블슈팅

- **"refuse: … 가 이미 있음"** — 해당 경로에 이미 다른 파일/링크가 있습니다. `--force`(백업 후 덮어쓰기) 또는 직접 정리 후 재실행하세요.
- **스킬이 안 보임** — Claude는 **새 세션**에서 로드됩니다. `claude plugin list`(마켓플레이스 설치) 또는 `ls -l ~/.claude/skills`(스크립트 설치)로 확인하세요. Codex는 `/skills` 메뉴로 확인.
- **저장소 위치 이동/삭제** — 심링크 설치는 클론한 저장소 경로에 의존합니다. 저장소를 옮기면 `./uninstall.sh`(옛 경로) 후 새 경로에서 `./install.sh`를 다시 실행하거나, 위치 비의존이 필요하면 `--copy`로 설치하세요.
- **레포 기여 개발** — 이 저장소는 에이전트를 플러그인 컨벤션(`agents/`)에, 스킬을 `.claude/skills/`에 둡니다. 저장소 안에서 직접 테스트하려면 `./install.sh`로 한 번 전역 연결한 뒤(에이전트가 `~/.claude/agents`에서 탐색됨) 사용하세요.

## 요구 사항

- Claude Code: 마켓플레이스/플러그인 지원 버전(`claude plugin` 명령 사용 가능).
- Codex CLI: 0.121.0 이상(`~/.codex/skills` Skills 지원).
- macOS·Linux의 `bash`. (Windows는 WSL 권장 — 심링크 때문에.)
