# KitchenFlow (60계치킨) — 프로젝트 규칙

공용 작업 규칙은 `claude-config` 마켓플레이스의 `global-rules` 플러그인이 주입한다
(`.claude/settings.json` 참고). 이 문서에는 KitchenFlow에만 해당하는 내용만 둔다.

## 스펙 정본 위치

- KitchenFlow의 스펙 정본은 **`C:\Projects\60gye-chicken\`의 `CLAUDE.md` + `_spec\`** 이다.
  데스크탑이 정본 소스이며, 맥미니·NAS·`.66` 등 원격 작업이라도 이 문서를 먼저 읽고
  시작한다.
- ⚠️ 정본이 로컬 PC 경로에만 있으므로 **웹·모바일 등 원격 세션에서는 읽을 수 없다.**
  그런 세션에서는 스펙을 읽은 척하지 말고, 읽지 못했다는 사실을 먼저 밝히고 진행한다.
  원격에서도 스펙이 필요하면 `_spec/`을 git 저장소로 옮겨야 한다.

## 커밋·푸시 순서

```
스테이징 커밋 → 스테이징 Gitea push → 로컬 커밋 → GitHub push → Gitea push
```

1. **스테이징(Gitea)** 먼저 커밋 & 푸시
2. 그 다음 **로컬** 커밋
3. 마지막으로 **GitHub + Gitea** 푸시

푸시 범위는 공용 규칙(`20-git-push.md`)을 따른다. "스테이징에 푸시해"는 Gitea에만,
"GitHub에 푸시해"는 origin에만 푸시한다.

## 프로덕션 DB

공용 규칙(`30-production-db.md`)을 따른다. 요약하면 `seed_material_mappings.py` 같은
시드 스크립트는 로컬·스테이징 전용이며, 프로덕션 변경은 사전 확인 + 재고를 건드리지
않는 별도 스크립트로만 한다.
