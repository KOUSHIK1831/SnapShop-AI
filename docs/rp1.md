# Evaluation of ApnaBazar as a B.Tech IP-2 Final Report Topic

**Based on codebase audit** (7,277 lines of TS/TSX, 91 files)

---

## 1. Academic Suitability

**Confirmed:**

- ~7,300 lines of real TypeScript/React code across 5 pages, 11 custom components, 4 hooks, 1 Supabase Edge Function, 4 database tables with RLS and triggers, 70 i18n keys in 3 languages
- Non-trivial architecture: React + TypeScript + Vite + Supabase (Auth + DB + Storage + Edge Functions) + Gemini 2.5 Flash + TanStack Query + shadcn/ui

**Assessment:** More than sufficient for a 50-60 page report. Satisfies all three criteria: emerging technology (AI + edge functions), real-world solution (actual deployment at `apna-bazar-cs.vercel.app`), and mini-project scope. Many B.Tech internship reports cover projects with 1/3 the complexity.

**Title "Design and Development of an AI-Powered Digital Storefront Platform for Local Retail Sellers"** is appropriate — descriptive, specific, and academically sound.

---

## 2. Technical Depth

**Strongest technical aspects:**
| Component | What is confirmed |
|---|---|
| **AI Edge Function** (`supabase/functions/digitize/index.ts:1-131`) | Real Gemini 2.5 Flash integration via Lovable AI Gateway. Image fetch → base64 → API call → JSON parsing with markdown sanitization → fallback product on parse failure → explicit 429/402 error handling |
| **useSeller hook** (`src/hooks/useSeller.tsx:1-217`) | 5 entities, 4 fetch functions, 5 mutations, cascading data loading, field mapping between frontend and DB schema |
| **UploadZone component** (`src/components/UploadZone.tsx:1-281`) | Multi-state state machine (idle→uploading→processing→complete/error), client-side compression, batch processing |
| **Database schema** (2 migrations) | 4 tables with RLS policies, triggers, auto-creation of seller profile on signup, status enums with CHECK constraints |
| **i18n** (`src/i18n/translations.ts:1-179`) | 70 keys × 3 languages = 210 translations, actively used across all pages |
| **Client-side image compression** (`src/lib/utils.ts`) | Canvas-based, quality fallback, target ~100KB |

**What is standard CRUD:**

- Product CRUD (useSeller:167-183) — straightforward Supabase read/write
- Auth flow (useAuth.tsx) — standard Supabase Auth wrapper
- Store settings form — form validation + Supabase upsert

**AI integration depth:** **Substantial, not superficial.** The edge function is 131 lines of real logic (not a thin API pass-through). It fetches external images, converts to base64, constructs a specific multi-modal prompt for clothing digitization, handles JSON cleaning and parse failures, and surfaces specific error codes (429, 402). The frontend upload flow orchestrates upload → AI call → result display with progress states.

**Missing:** No AI output validation beyond JSON parsing, no human-in-the-loop review step, no accuracy metrics logged.

---

## 3. Originality & Uniqueness

**Confirmed:** The combination of (a) AI-powered product digitization from images + (b) instant multilingual storefront + (c) WhatsApp integration + (d) target audience of local Indian retailers is **genuinely differentiated** from typical student projects.

**Comparison to typical B.Tech projects:**

- Most e-commerce projects are standard CRUD with no AI component
- Most AI projects are chatbots or classifiers trained on canned datasets
- Most localization efforts stop at 2 languages with incomplete coverage
- This project has all four: AI + e-commerce + 3-language full coverage + WhatsApp commerce

**Risk:** The evaluator may ask "how is this different from Meesho/Shopify?" — be prepared to answer that those are generic multi-seller platforms, while ApnaBazar is specifically built for single-seller rapid digitization in < 2 minutes with no technical setup.

---

## 4. Strengths

1. **Full-stack integration work** — Auth → Storage → AI → DB → UI is a complete pipeline with proper state management
2. **AI integration with real error handling** — not a toy demo; handles rate limits and credit exhaustion
3. **Complete i18n** — every user-facing message is translated to Hindi and Telugu (this is rare in student projects)
4. **Deployed and accessible** — public demo URL exists, meaning the project works end-to-end
5. **Well-structured schema** — RLS policies, triggers, proper foreign keys, typed interfaces
6. **Client-side image compression** — shows awareness of real-world constraints (file size limits, bandwidth)

---

## 5. Weaknesses

| Issue                                        | Evidence                                                                                                               | Severity       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------- |
| **Zero real tests**                          | `src/test/example.test.ts` contains only `expect(true).toBe(true)`                                                     | **Critical**   |
| **Zero Playwright tests**                    | Config exists, no `.spec.ts` files                                                                                     | **Critical**   |
| **Two Supabase clients**                     | `lib/supabase.ts` (untyped) and `integrations/supabase/client.ts` (typed) both exist and the hooks use the untyped one | **Medium**     |
| **Order placement is disabled**              | Storefront shows "Coming Soon" for order button; `placeOrder()` exists but is dead code                                | **Medium**     |
| **AI accuracy unevaluated**                  | No mechanism to log or measure AI extraction correctness                                                               | **Medium**     |
| **No loading/skeleton states in all places** | Some pages show raw loading text                                                                                       | **Low-Medium** |
| **No error boundary**                        | No React error boundary wrapping the app                                                                               | **Low**        |
| **No CI/CD**                                 | No GitHub Actions or similar visible                                                                                   | **Low**        |
| **Edge function has no auth protection**     | `verify_jwt = false` in `config.toml` — anyone could invoke the digitize endpoint                                      | **Medium**     |
| **Both `bun.lock` and `package-lock.json`**  | Ambiguous package management                                                                                           | **Low**        |

---

## 6. Viva Voce — Questions an Evaluator Might Ask

| Question                                         | How to answer                                                                                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| "How do you measure AI accuracy?"                | **You currently can't** — this is a gap. Build an evaluation set of ~50 labeled product images and measure title/description/category accuracy |
| "Why did the order placement remain incomplete?" | Acknowledge scope constraint. Explain the WhatsApp bridge pattern as an alternative                                                            |
| "How do you handle concurrent uploads?"          | The UploadZone component has per-file states but no queue management or concurrency limit                                                      |
| "How secure is the edge function?"               | Currently unprotected (`verify_jwt: false`). Discuss adding JWT verification                                                                   |
| "What happens if Gemini returns garbage?"        | There's a JSON parse fallback to a default product — but no semantic validation                                                                |
| "Why two Supabase clients?"                      | This is a code quality issue — acknowledge it and explain migration plan                                                                       |
| "What performance optimization did you do?"      | Image compression, memoization via TanStack Query, lazy loading of routes                                                                      |

---

## 7. Advanced Enhancements (Academic Value)

Ranked by impact on your report's academic rigor:

| Enhancement                                                                                                                                                    | Impact                                                         | Effort                           |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------- |
| **1. AI accuracy evaluation** — build a test set of 50-100 labeled clothing images, measure precision/recall of title, category, price estimation              | **Highest** — gives you a results chapter with real numbers    | Medium                           |
| **2. Add unit tests (Vitest)** — test `compressImage`, `useSeller`, translations parsing, edge function response parsing                                       | **High** — removes the "zero tests" stigma                     | Medium                           |
| **3. Add E2E tests (Playwright)** — test the full upload → AI → storefront flow                                                                                | **High** — demonstrates CI/CD readiness                        | Medium                           |
| **4. Image-to-text OCR for label extraction** — use Gemini's vision capability to read price tags, labels, brand names from images, and display extracted text | **Medium-High** — strengthens the AI narrative                 | Low (Gemini already supports it) |
| **5. Semantic search** — store Gemini embeddings in PostgreSQL via `pgvector` and allow natural language product search                                        | **Medium-High** — adds vector DB + embedding section to report | Medium                           |
| **6. Admin analytics dashboard** — aggregate metrics across all sellers                                                                                        | **Medium** — adds an analytics chapter                         | Medium                           |
| **7. AI quality scoring** — add confidence scores to AI output; flag low-confidence products for human review                                                  | **Medium** — demonstrates production thinking                  | Medium                           |
| **8. Performance benchmarking** — measure upload-to-storefront latency, compression ratio, AI response time, vs manual entry baseline                          | **Medium** — fills the "Evaluation" chapter with real graphs   | Medium                           |
| **9. Role-based access control** — admin vs seller vs buyer roles                                                                                              | **Low-Medium** — standard but easy to add to report            | Medium                           |
| **10. A/B testing** — compare AI-assisted upload vs manual form for time-to-publish                                                                            | **Low-Medium** — interesting but requires user study           | High                             |

---

## 8. Research Potential

**Confirmed:** The project naturally supports all standard report sections:

| Section                 | Content                                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Literature Review**   | AI in e-commerce · Digital divide for small retailers in India · Vision-language models for product understanding · Multilingual UX design patterns · Low-code/BaaS platforms |
| **System Architecture** | C4 diagrams: context → containers → components → code (React → Supabase → Gemini)                                                                                             |
| **Database Design**     | ER diagram of sellers/products/files/orders with RLS policies                                                                                                                 |
| **Algorithms**          | Image compression algorithm · Gemini prompt engineering · JSON extraction pipeline                                                                                            |
| **Testing**             | _Currently missing_ — but can add Vitest unit tests + Playwright E2E                                                                                                          |
| **Results & Metrics**   | AI accuracy · compression ratio · latency · time-to-publish                                                                                                                   |
| **Future Scope**        | RBAC · semantic search · OCR · payment gateway · analytics · mobile app                                                                                                       |

**Publishable paper:** With the addition of AI accuracy metrics (item 1 in Section 7), this can be expanded into a conference paper for **ICDEIS, ICCCNT, or INDICON** — especially with a focus on "AI-Assisted Digitization for Micro-Retailers in India."

---

## 9. Evaluation Metrics to Report

| Metric                     | How to measure                                                                           | Where in report      |
| -------------------------- | ---------------------------------------------------------------------------------------- | -------------------- |
| **AI extraction accuracy** | Manual evaluation of 50-100 products: % correct title, category, price within ±20%       | Results chapter      |
| **Time reduction**         | Measure manual entry (typing title/desc/price/category/tags) vs AI-assisted (~30s total) | Results chapter      |
| **Image compression**      | Original vs compressed file size (KB), quality score, time taken                         | Performance section  |
| **AI response time**       | P50/P95/P99 latency of edge function → Gemini → response                                 | Performance section  |
| **Translation coverage**   | 70 keys × 3 languages = 100% coverage (already confirmed)                                | Localization section |
| **Build size / bundle**    | Vite build output: vendor chunk size, gzipped size                                       | Deployment section   |
| **Test coverage**          | Vitest coverage report (`--coverage` flag)                                               | Testing section      |

---

## 10. Comparison: ApnaBazar vs RAG Project as a Report Topic

| Dimension              | ApnaBazar (this project)                                      | Typical RAG project                                                  |
| ---------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Technical novelty**  | E-commerce × Vision AI × Localization                         | Document retrieval × embeddings                                      |
| **Real-world impact**  | Direct — helps actual small retailers                         | Indirect — depends on use case                                       |
| **AI complexity**      | Multimodal (vision + text), prompt engineering                | Text embeddings, vector search                                       |
| **Difficulty**         | Full-stack + AI integration                                   | Backend-heavy, simpler frontend                                      |
| **Report depth**       | Can cover frontend, backend, DB, AI, localization, deployment | Focuses on retrieval pipeline, embedding models, chunking strategies |
| **Evaluator appeal**   | Tangible product they can visit                               | Abstract system they can't easily demo                               |
| **Viva defensibility** | "Show me the storefront" — easy to demonstrate                | "Show me a query" — harder to impress                                |

**Verdict:** A RAG project is **academically comparable** but harder to demonstrate impact. ApnaBazar is the stronger choice for an internship report because it shows end-to-end product building skills, which is exactly what an internship is supposed to demonstrate.

---

## 11. Overall Ratings

| Dimension                | Rating (/10) | Justification                                                                                                                         |
| ------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Technical Complexity** | **7.5/10**   | Full-stack with AI, auth, storage, localization, deployment. Dock 2.5 for no tests, dead order flow                                   |
| **Innovation**           | **7/10**     | AI-assisted product digitization for Indian micro-retailers is not novel in industry (Meesho, etc.) but is novel for a B.Tech project |
| **Academic Value**       | **7.5/10**   | Rich content for all sections. Could be 8.5+ with tests and AI accuracy metrics                                                       |
| **Originality**          | **7/10**     | The combination is unique even if individual pieces (AI, e-commerce, i18n) are standard                                               |
| **Viva Defensibility**   | **7/10**     | Strong because the product is deployed and demoable. Weak on security, testing, and AI accuracy questions                             |
| **Overall**              | **7.2/10**   |                                                                                                                                       |

---

## 12. Final Recommendation

**Yes, I recommend this as your IP-2 final report topic**, with conditions.

**Why yes:**

- The project has genuine technical breadth: React + TypeScript + Supabase (Auth/DB/Storage/Functions) + Gemini 2.5 Flash + i18n
- It is **deployed and accessible** — this is a significant advantage over most student projects
- The problem statement (digitizing local retailers) is meaningful, well-scoped, and easy to defend
- The AI integration is **substantial**, not just an API call from a button
- The i18n implementation (3 languages, 70 keys, 100% coverage) is genuinely strong

**What you MUST fix before submission:**

1. **Write real tests.** Add Vitest unit tests for the image compression util, the useSeller hook (mock Supabase), and the edge function's JSON parsing logic. Add 2-3 Playwright E2E tests for the critical paths (auth → upload → storefront). This alone removes the #1 weakness.

2. **AI accuracy evaluation.** Build a test set of 30-50 labeled product images, run them through the pipeline, and report accuracy metrics (title match, category precision, price estimation error). This gives you a "Results" chapter with real data and graphs.

3. **Clean up the two Supabase client** instances — consolidate into one typed client.

4. **Either complete the order flow or remove the "Coming Soon" CTA.** A disabled button that says "Coming Soon" in a deployed product raises questions about project completeness.

5. **Add JWT verification to the edge function** (`verify_jwt = true`) and pass the auth token from the frontend. This addresses the most obvious security concern.

6. **Add a React error boundary** at the app level.

**If you do items 1-3, the project becomes a 8.5/10 topic.** Without them, expect tough viva questions on "How did you test this?" and "How accurate is the AI?"
