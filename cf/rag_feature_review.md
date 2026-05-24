# Ask Your Corpus / RAG Feature — Production Code Review

**Branch:** `feat/rag-ui-implement`
**Base:** `develop`
**Reviewer Scope:** Frontend only. Backend is source of truth.

---

## Executive Summary

| Dimension | Assessment |
|---|---|
| **Feature Purpose** | Full RAG (Retrieval-Augmented Generation) UI — document selection, LLM-powered indexing, knowledge map viewing, and conversational Q&A |
| **Health Score** | **7.5 / 10** — Solid architecture, clean refactors in this diff, but 3 **hard bugs** from missing translation keys and 1 structural translation regression |
| **Production Readiness** | **CONDITIONAL PASS** — Must fix the 3 missing `common.*` translation keys before merge; everything else is medium/low priority |

---

## Git Change Analysis

### Branch Commits (20 commits on `feat/rag-ui-implement` ahead of `develop`)
28 files changed, +8063 / -47 lines. This is a **feature-add branch** — almost entirely net-new code.

### Working Tree Diff (unstaged changes under review)
These are the latest refinements on top of the committed branch code:

| File | Change Type | Purpose |
|---|---|---|
| `src/types/rag.ts` | Refactor | Remove `times_queried`, tighten `any` → `unknown` |
| `src/services/ragService.ts` | Major refactor | Centralized `request<T>()`, remove `setToken()`, add `extractErrorMessage()`, make token `readonly` |
| `src/services/llmService.ts` | Cleanup | Remove unused `JsonPrimitive/JsonValue/JsonObject` types |
| `src/components/rag/RAGPanel.tsx` | Major refactor | Remove stale `computeFingerprint`, `needsReindexFromPatchedText`, `onPrepareAndIndexReady`, `toHex`, `parseTimestamp`; wrap `performIndexing` in `useCallback`; conditional Groq delay |
| `src/components/rag/QueryInterface.tsx` | i18n fix | Replace hardcoded "No relevant context found." with `t()` call |
| `src/components/rag/KnowledgeMapViewer.tsx` | Refactor + cleanup | Replace hand-rolled collapsible with `<Collapsible>` component; remove `console.log/error` debug statements; remove `times_queried` display |
| `src/pages/AskYourCorpusPage.tsx` | Refactor | ErrorBoundary i18n via labels prop; `getStatusLabel` → `getStatusMeta` with `ready_for_indexing` branch; DRY `selectedDocumentStatus`; fix `t('common.')` empty key |
| `src/locales/en/translation.json` | Feature keys | Add 6 new `tools.askYourCorpus*` keys, 2 new `rag.*` keys; restructure `common.change` → nested object + `common.changeLabel` |
| `src/locales/{bn,hi,kn,ml,ta,te}/translation.json` | Feature keys | Mirror EN additions; restructure `common.change`; add `rag.noRelevantContextFound`, `rag.statusChecking`, `rag.statusNoText`, `rag.networkErrorCheckConnection`, `rag.knowledgeMapErrorDescription`, `rag.processingBlocked` (updated copy) |
| `tests/src/components/rag/KnowledgeMapViewer.test.tsx` | Align | Remove `times_queried` from mock |
| `tests/src/components/rag/QueryInterface.test.tsx` | Align | `times_queried` → `node_count/edge_count`; remove old retrieval params assertions |
| `tests/src/components/rag/RAGPanel.test.tsx` | Align | `storeIndex` → `upsertKnowledge`; remove fingerprint arg; update reindex test to trust backend status |
| `tests/src/services/ragService.test.ts` | Align | `storeIndex` → `upsertKnowledge`; old `/index`, `/retrieve` → `/knowledge` (PUT), `/retrievals` (POST); remove old params |

### Files NOT in review scope but also dirty

| File | Risk |
|---|---|
| `.env.example` | Low — config only |
| `src/components/Categories.tsx` | **Unrelated** — should NOT be in this branch |
| `src/components/ContentInput.tsx` | **Unrelated** — should NOT be in this branch |
| `vite.config.ts` | Low — build config |

> [!WARNING]
> `Categories.tsx` and `ContentInput.tsx` are modified but unrelated to Ask Your Corpus. These should be reverted or split into a separate PR.

---

## File-by-File Validation

| File | Status | Reason |
|---|---|---|
| `src/types/rag.ts` | ✅ **CORRECT** | Removes stale `times_queried`; `any` → `unknown` is type-safe |
| `src/services/ragService.ts` | ✅ **CORRECT** | Centralized error handling via `request<T>()` is excellent; `readonly token`, removed `setToken()`, added 500 handling |
| `src/services/llmService.ts` | ✅ **CORRECT** | Removed unused `JsonPrimitive/JsonValue/JsonObject` types — pure dead code cleanup |
| `src/components/rag/RAGPanel.tsx` | ✅ **CORRECT** | Removed 4 stale functions, added `useCallback` to `performIndexing`, conditional Groq delay, removed `onPrepareAndIndexReady` prop |
| `src/components/rag/QueryInterface.tsx` | ✅ **CORRECT** | Hardcoded string → i18n. Minimal, correct |
| `src/components/rag/KnowledgeMapViewer.tsx` | ✅ **CORRECT** | `Collapsible` reuse, debug log removal, stale `times_queried` UI removal |
| `src/pages/AskYourCorpusPage.tsx` | ⚠️ **PARTIALLY CORRECT** | Good refactors, but ErrorBoundary `labels` prop creates a subtle bug (see below) |
| `src/locales/en/translation.json` | ⚠️ **PARTIALLY CORRECT** | Feature keys correct; `common.change` restructuring is **unrelated** to this feature |
| `src/locales/{bn,hi,kn,ml,ta,te}` | ⚠️ **PARTIALLY CORRECT** | Feature keys correct; `common.change` restructuring is unrelated; old `changeSource`/`changeLanguage` flat keys left as orphans in some locales |
| `tests/src/components/rag/*.test.tsx` | ✅ **CORRECT** | Properly aligned with new API surface |
| `tests/src/services/ragService.test.ts` | ✅ **CORRECT** | Endpoints, methods, payloads all updated |

---

## Backend Contract Alignment

### `rag.ts` — Types

| Check | Result |
|---|---|
| `KnowledgeStatusResponse` uses `current_version` / `indexed_version` | ✅ Matches backend |
| `times_queried` removed from `UsageStats` | ✅ Backend no longer returns it |
| `RetrievalResponse.adaptive_params` changed from `Record<string, any>` → `Record<string, unknown>` | ✅ Type-safe, still compatible |
| `KnowledgeUpdateResponse` has `indexed_version` | ✅ |
| `RAGProvider` includes `deepseek` | ✅ |
| No stale `fingerprint` field in types | ✅ Removed |

### `ragService.ts` — Endpoints

| Endpoint | Method | Status |
|---|---|---|
| `/{recordId}/knowledge-status` | GET | ✅ |
| `/{recordId}/knowledge` | PUT | ✅ (was `POST /index`) |
| `/{recordId}/knowledge-map` | GET | ✅ |
| `/{recordId}/retrievals` | POST | ✅ (was `POST /retrieve`) |
| `/records/{recordId}` | GET | ✅ |

| Check | Result |
|---|---|
| `retrieveContext` sends only `{ query }` (no `topK`, `contextWindow`, `trigramThreshold`) | ✅ Backend handles params server-side now |
| `upsertKnowledge` sends `{ metadata_index, knowledge_graph, client_metadata }` | ✅ |
| Auth: `Bearer ${this.token}` in every request | ✅ |
| Token is `readonly`, set once in constructor | ✅ |
| No stale `setToken()` method | ✅ Removed |
| No stale `storeIndex()` method | ✅ Removed |

### Components — Stale Backend References

| Check | Result |
|---|---|
| `computeFingerprint` removed | ✅ |
| `needsReindexFromPatchedText` removed | ✅ |
| `parseTimestamp` / `toHex` helpers removed | ✅ |
| `onPrepareAndIndexReady` prop removed | ✅ |
| No references to `last_indexed_at` | ✅ |
| No references to `times_queried` in UI | ✅ |
| `KnowledgeMapViewer` no longer renders `times_queried` stat | ✅ |

> **Verdict: Frontend ↔ Backend alignment is CLEAN.** No stale fields, no old endpoints, no old params.

---

## Login / Auth Review

| Check | Result |
|---|---|
| Route protection | `AskYourCorpusPage` uses `useAuth()` for `token`, `user`, `isReady` — gated on all three |
| Bearer token | `RAGService` constructor takes `token`, uses `Bearer ${this.token}` |
| Logout cleanup | `useAuth.tsx` logout now calls `clearRAGSessionStorage({ includeHistory: true })` — ✅ |
| Component unmount | `AskYourCorpusPage` has `useEffect(() => { return () => clearRAGSessionStorage(); }, [])` — ✅ |
| 401 handling | `ragService.userMessageFromStatus` doesn't explicitly handle 401; falls through to fallback string. The `extractErrorMessage` will surface backend's detail. **Acceptable** since the global auth interceptor should handle 401 → redirect |
| Session persistence | API key + provider stored in `sessionStorage` (cleared on logout and unmount) — ✅ |
| No regressions vs develop | `useAuth.tsx` diff only adds the `clearRAGSessionStorage` import + call in logout — minimal, safe |

> **Verdict: Auth is SAFE. No regressions.**

---

## Dead Code Findings

### Code-level Dead Code

| Finding | File | Severity |
|---|---|---|
| ~~`computeFingerprint`~~ | Removed ✅ | — |
| ~~`needsReindexFromPatchedText`~~ | Removed ✅ | — |
| ~~`toHex`, `parseTimestamp`~~ | Removed ✅ | — |
| ~~`JsonPrimitive/JsonValue/JsonObject`~~ | Removed ✅ | — |
| ~~`setToken()`~~ | Removed ✅ | — |
| `handleAnswer` in RAGPanel is **not** wrapped in `useCallback` | [RAGPanel.tsx:442](file:///home/koushik/cf/corpus-client-app/src/components/rag/RAGPanel.tsx#L442) | Low — no dep array issues since it's only used as `onAnswer` prop |
| Two blank lines at L310-311 in `performIndexing` | [RAGPanel.tsx:310](file:///home/koushik/cf/corpus-client-app/src/components/rag/RAGPanel.tsx#L310) | Cosmetic |

### Test Dead Code
All stale mocks (`storeIndex`, `times_queried`, old retrieval params) have been properly removed. **No stale test code remaining.**

---

## Translation Findings (Feature Only)

### 🔴 HIGH PRIORITY — Missing Translation Keys (HARD BUGS)

These 3 `common.*` keys are **referenced in code but do NOT exist in any locale file**:

| Key Used in Code | File | Impact |
|---|---|---|
| `common.thisDocumentNeedsToBeIndexedBeforeYouCanAskQuestionsIndexingUsesYourLlmApiCreditsOnetimePerDocument` | [RAGPanel.tsx:541](file:///home/koushik/cf/corpus-client-app/src/components/rag/RAGPanel.tsx#L541) | **Will render raw key string** in the preparation card description |
| `common.IndexingGeneratingMetadataAndKnowledgeGraph` | [RAGPanel.tsx:557](file:///home/koushik/cf/corpus-client-app/src/components/rag/RAGPanel.tsx#L557) | **Will render raw key string** during indexing spinner |
| `common.refresh` | [AskYourCorpusPage.tsx:886](file:///home/koushik/cf/corpus-client-app/src/pages/AskYourCorpusPage.tsx#L886) | Uses `defaultValue: 'Refresh'` so **won't break visually** but key doesn't exist for i18n consistency |

> [!CAUTION]
> The first two keys have **no `defaultValue` fallback** — users will see the raw key string like `common.thisDocumentNeedsToBeIndexed...` in the UI. This is a **production-breaking i18n bug**.

### Correct Feature Translation Changes
- ✅ `tools.askYourCorpusConnectProvider` — added in all 7 locales
- ✅ `tools.askYourCorpusApiKeyRequired` — added in all 7 locales
- ✅ `tools.askYourCorpusApiKeyDescription` — added in all 7 locales
- ✅ `tools.askYourCorpusSelectedDocumentLabel` — added in all 7 locales
- ✅ `tools.askYourCorpusErrorBoundaryTitle` — added in all 7 locales
- ✅ `tools.askYourCorpusErrorBoundaryDescription` — added in all 7 locales
- ✅ `rag.noRelevantContextFound` — added in all 7 locales
- ✅ `rag.statusChecking` — added in all 7 locales
- ✅ `rag.statusNoText` — added in ta/te (was missing)
- ✅ `rag.networkErrorCheckConnection` — added in ta/te
- ✅ `rag.knowledgeMapErrorDescription` — added in ta/te
- ✅ `rag.processingBlocked` — updated copy in ta/te

### ⚠️ Unrelated Translation Changes
The `common.change` restructuring from flat string → nested object (`common.change.source`, `common.change.language`) + addition of `common.changeLabel`:
- This is used by `LanguageSwitcher.tsx` and `InlineEditHistory.tsx` — **NOT by Ask Your Corpus**
- The old flat keys `common.changeSource` and `common.changeLanguage` are left as orphans in some locales (ta, te confirmed)
- **This change should be in a separate PR**

### No Regressions
- `common.change.source` and `common.change.language` are correctly referenced by existing components
- No existing shared keys were broken

---

## Reusable Component Review

| Improvement | Current | Recommendation |
|---|---|---|
| `ExpandableSection` in KnowledgeMapViewer | ✅ **Already refactored** to use `<Collapsible>` from `@/components/ui/collapsible` | Good |
| ErrorBoundary in AskYourCorpusPage | Inline class component | Could be extracted to shared `@/components/ErrorBoundary` but low priority for a single usage |
| Status badges (Ready/Not indexed/No text) | Repeated inline in AskYourCorpusPage | Could extract a `<StatusBadge status={...}>` component — medium value |
| Document list cards | 60+ lines of repeated JSX for mobile chips + desktop cards | Could extract `<DocumentCard>` — medium value for readability |
| API key modal pattern | Wraps `<APIKeyInput>` in `<Dialog>` | Pattern is clean as-is |

### Profile Page Reuse Opportunities
- Profile page likely has similar card/badge patterns but without seeing that code, specific recommendations aren't possible
- The `useAuth` hook is already properly shared

---

## Component Quality Findings

### Oversized Components

| Component | Lines | Assessment |
|---|---|---|
| `AskYourCorpusPage.tsx` | 895 | **Oversized** — `AskYourCorpusContent` is ~770 lines. The document list (mobile + desktop), status logic, and API key modal could be extracted |
| `RAGPanel.tsx` | 674 | Acceptable — good separation of concerns |
| `QueryInterface.tsx` | 559 | Acceptable — complex but well-structured query pipeline |
| `KnowledgeMapViewer.tsx` | 420 | Good size |
| `llmService.ts` | 1491 | **Large** but it's a service, not a component. Each provider is isolated. Acceptable |

### Specific Quality Issues

1. **AskYourCorpusPage ErrorBoundary `labels` prop** — The `t()` calls in `labels` are evaluated at render time in the parent `AskYourCorpusPage`, but if the ErrorBoundary catches a crash in a child, the `labels` are still valid because they were captured before the crash. **This is actually correct**, but the prop duplication of the constructor type annotation is unnecessary (just use the interface).

2. **`handleAnswer` not memoized** in RAGPanel (L442) — It captures `setHistory` which is a stable setState, so it won't cause unnecessary rerenders, but `useCallback` would be more idiomatic.

---

## Service Layer Findings

### `llmService.ts`

| Aspect | Assessment |
|---|---|
| Removed `JsonPrimitive/JsonValue/JsonObject` | ✅ Dead code cleanup |
| Provider routing | Clean — each provider isolated in its own method |
| Retry logic | Solid — exponential backoff, token shrinking on 429, model fallback |
| JSON extraction | Robust — 3-tier parsing (direct → code fence → balanced braces) |
| Token budgets | Provider-specific budgets with enforced trim |
| Gemini model discovery | Cached in memory + sessionStorage, falls back to static list |
| **Risk**: All LLM calls use 60s timeout | Acceptable for indexing; could be tight for large documents |

### `ragService.ts`

| Aspect | Assessment |
|---|---|
| Centralized `request<T>()` | ✅ Excellent — single error handling path |
| `extractErrorMessage()` | ✅ Handles FastAPI `detail` (string + array), `message`, `error` |
| `userMessageFromStatus()` | ✅ Covers 400/403/404/409/422/429/500+ |
| Token immutability | ✅ `readonly` + no setter |
| `res.text()` consumed before `.ok` check | ✅ Prevents body-already-consumed errors |
| **Risk**: No request timeout/AbortController | The `request()` method catches `AbortError` but doesn't create its own timeout. Relies on browser/fetch defaults. **Medium risk** for long-running requests |

---

## Test Findings

| Test File | Contract Coverage | Stale Code | Missing Edge Cases |
|---|---|---|---|
| `KnowledgeMapViewer.test.tsx` | ✅ `times_queried` removed from mock | ✅ Clean | Low — could test error toast |
| `QueryInterface.test.tsx` | ✅ `times_queried` → `node_count/edge_count`; old retrieval params removed | ✅ Clean | Could test the i18n fallback text |
| `RAGPanel.test.tsx` | ✅ `storeIndex` → `upsertKnowledge`; fingerprint arg removed; reindex test updated | ✅ Clean | Could test `performIndexing` with Groq delay vs non-Groq |
| `ragService.test.ts` | ✅ `/index` → `/knowledge` (PUT); `/retrieve` → `/retrievals` (POST); body assertions added | ✅ Clean | Could test `extractErrorMessage` with various FastAPI error shapes |

> **Verdict: Tests are well-aligned with the refactored code. No stale mocks or assertions remain.**

---

## Performance Findings

| Finding | File | Severity |
|---|---|---|
| `ensureRecordExtractedText` has `extractedTextByRecordId` in its dependency array — every cache update recreates the callback | [RAGPanel.tsx:157](file:///home/koushik/cf/corpus-client-app/src/components/rag/RAGPanel.tsx#L157) | **Medium** — could use a ref for the cache to avoid callback churn |
| `ragService` and `ragService.getKnowledgeMap` are called in both the status-check `useEffect` and in `QueryInterface.handleSubmit` — potential duplicate call on first query | Multiple | Low — different timing, acceptable |
| `knowledgeMap` fetched on every query submit (no caching in QueryInterface) | [QueryInterface.tsx:413](file:///home/koushik/cf/corpus-client-app/src/components/rag/QueryInterface.tsx#L413) | **Medium** — could cache the knowledge map after first successful fetch |
| `collectKnowledgeMapTerms` joins all terms then slices to 1200 chars — O(n) but runs on every query | [QueryInterface.tsx:125](file:///home/koushik/cf/corpus-client-app/src/components/rag/QueryInterface.tsx#L125) | Low |

---

## High Priority Fixes (Must Fix Before Merge)

### 1. 🔴 Missing `common.*` translation keys — PRODUCTION BUG

Three keys used in code don't exist in **any** locale file:

- `common.thisDocumentNeedsToBeIndexedBeforeYouCanAskQuestionsIndexingUsesYourLlmApiCreditsOnetimePerDocument` → no `defaultValue` fallback → **raw key shown to user**
- `common.IndexingGeneratingMetadataAndKnowledgeGraph` → no `defaultValue` fallback → **raw key shown to user**
- `common.refresh` → has `defaultValue: 'Refresh'` fallback → visually OK but should be added for completeness

**Fix:** Either add these keys to all locale files, or (better) add `defaultValue` fallbacks in the `t()` calls and consider shorter key names.

### 2. 🟡 Revert unrelated file changes

`Categories.tsx` and `ContentInput.tsx` are dirty in this branch but unrelated to Ask Your Corpus. Either revert or split to a separate commit/PR.

---

## Medium Priority Improvements (Can Improve Later)

| # | Improvement | Files |
|---|---|---|
| 1 | Move `common.change` restructuring to its own PR | All locale files |
| 2 | Add `AbortController` timeout to `ragService.request()` (e.g. 30s) | `ragService.ts` |
| 3 | Cache `knowledgeMap` in `QueryInterface` after first fetch to avoid re-fetching on every query | `QueryInterface.tsx` |
| 4 | Use a `useRef` for `extractedTextByRecordId` cache to avoid callback churn in `ensureRecordExtractedText` | `RAGPanel.tsx` |
| 5 | Extract document list into `<DocumentCard>` component to reduce `AskYourCorpusPage` size | `AskYourCorpusPage.tsx` |
| 6 | Wrap `handleAnswer` in `useCallback` for consistency | `RAGPanel.tsx` |
| 7 | Remove orphaned flat `changeSource`/`changeLanguage` keys from locales that still have them alongside the new nested structure | Locale files |

---

## Final Verdict

| Question | Answer |
|---|---|
| **Are these changed files correct?** | Yes — all changes are intentional, well-structured, and aligned with the backend contract evolution |
| **Was any file changed unnecessarily?** | Yes — `Categories.tsx`, `ContentInput.tsx` are unrelated dirty files; `common.change` restructuring in locales is unrelated to this feature |
| **Does frontend align with backend?** | **YES** — endpoints, methods, payloads, types, and response handling are all correct |
| **Is there dead code left?** | Minimal — 2 blank lines, 1 unmemoized handler. All stale RAG logic is properly removed |
| **Can this branch merge safely?** | **CONDITIONAL YES** — Fix the 3 missing `common.*` translation keys first. The first two will show raw key strings to users in production |
| **Can Profile page components improve this feature?** | Potentially for shared cards/badges, but not blocking |

> [!IMPORTANT]
> **Bottom line:** This is a well-executed refactor. The backend alignment is clean, stale code is thoroughly removed, tests are updated, and the architecture is sound. The only **hard blocker** is the 3 missing translation keys that will render as raw strings in the preparation card UI. Fix those and this is merge-ready.
