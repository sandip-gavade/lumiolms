# Lumio LMS — Requirements

Scope: **Multi-tenant B2B SaaS** — organizations sign up as tenants and get a branded
instance; each tenant has its own Student + Instructor + Admin (Org Admin) users, plus a
platform-level Super Admin role across all tenants. Paid courses (payment gateway). Target
~10k users / ~500 concurrent. Video hosted on a third-party platform (Mux / Cloudflare
Stream). Deploy on GCP.

**Stack decisions locked in:** PostgreSQL + Prisma, custom JWT (access + refresh token) auth,
Postgres full-text search for catalog, BullMQ + Redis for async jobs (emails, certificate
PDFs, video-status webhooks), shared DB with row-level `tenant_id` isolation.

Source reference: student-facing UI mockup at
`lms-learning-platform-i-ll-build-a-fully-functional-multi-pa/project/Lumio LMS.dc.html`
(login/signup, dashboard, browse/filter courses, course detail, lecture player w/ notes &
Q&A, my learning, profile/settings, reviews) — this covers the in-tenant student experience;
tenancy, instructor, and admin layers are new on top of it.

---

## 1. Functional Requirements

### 1.0 Tenancy & Organizations
- FR-0.1 Self-serve or sales-assisted tenant (organization) signup: org name, subdomain
  (`{org}.lumio.app`), plan selection.
- FR-0.2 Tenant branding: logo, primary color, subdomain; custom domain (CNAME) as a
  stretch goal.
- FR-0.3 Every user, course, order, and content record belongs to exactly one `tenant_id`;
  all queries scoped by tenant (enforced centrally, e.g. Prisma middleware — not per-query
  discipline).
- FR-0.4 Org Admin role: manage users/instructors/courses/branding/billing within their own
  tenant only.
- FR-0.5 Platform Super Admin role: cross-tenant visibility — create/suspend tenants, global
  analytics, impersonation for support (audited).
- FR-0.6 Tenant-level suspension (e.g. non-payment) blocks login for all users in that
  tenant without affecting other tenants.

### 1.1 Authentication & Accounts
- FR-1.1 Email/password signup and login; Google OAuth login. Login is tenant-aware
  (resolved via subdomain or an org picker if a user belongs to multiple tenants).
- FR-1.2 Password reset via emailed link (time-limited token).
- FR-1.3 Custom JWT session (access + refresh token, refresh rotation, logout/invalidate);
  access token carries `tenant_id` + role claims.
- FR-1.4 Role-based access: `student`, `instructor`, `org_admin` are per-`Membership` (a user
  may hold different roles in different tenants, and student + instructor simultaneously
  within one tenant); `super_admin` is a platform-wide flag independent of any membership.
- FR-1.5 Profile management: name, avatar, email change (re-verify), password change,
  notification preferences.
- FR-1.6 Email verification on signup.

### 1.2 Course Catalog (public / student)
- FR-2.1 Browse/search courses (Postgres full-text search on title/description/tags) with
  filters: category, level, rating, price, duration. Search and catalog are scoped to the
  requesting tenant.
- FR-2.2 Course detail page: description, curriculum (sections/lectures), instructor bio,
  price, ratings summary, review list, "students also bought" (within same tenant).
- FR-2.3 Preview lectures (free sample) without enrollment.
- FR-2.4 Ratings & written reviews, one per enrolled student, editable by author.

### 1.3 Commerce
- FR-3.1 Shopping cart (add/remove courses), single or multi-item checkout, scoped to one
  tenant's catalog per cart.
- FR-3.2 Payment gateway integration (Stripe recommended for GCP/global card + webhook
  support); support one-time purchase per course. *(Open question: does the org itself also
  pay Lumio a subscription for platform access, separate from end-user course purchases? See
  §4.)*
- FR-3.3 Discount/coupon codes and time-boxed sales pricing, defined per tenant.
- FR-3.4 Order history and downloadable invoices/receipts.
- FR-3.5 Refund workflow (e.g. 30-day money-back), org-admin-initiated or self-serve within
  window.
- FR-3.6 Instructor payout ledger (revenue share tracking) — payout execution can be manual
  in v1, but must be trackable.
- FR-3.7 Platform billing: each tenant has a subscription plan/tier (e.g. seat-based or flat
  fee) billed to the Org Admin, independent of end-user course purchases.

### 1.4 Learning Experience
- FR-4.1 Enroll grants access to full curriculum; track per-lecture completion + overall
  course progress %.
- FR-4.2 Video lecture player: resume position, playback speed, mark-complete, prev/next
  navigation.
- FR-4.3 Per-lecture resources: transcript, downloadable exercise files/source code.
- FR-4.4 Timestamped personal notes per lecture.
- FR-4.5 Q&A: students post questions on a lecture/course; instructors (or other students)
  reply as threaded answers.
- FR-4.6 "My Learning" dashboard: in-progress / completed courses, streak counter, recent
  activity feed, recommended courses.
- FR-4.7 Course completion certificate (generated PDF) once 100% complete.
- FR-4.8 Notifications (in-app + email): new Q&A reply, course announcement, sale, reminder
  to resume a course.

### 1.5 Instructor
- FR-5.1 Instructor application/onboarding (org-admin-approved before publishing), within
  their tenant.
- FR-5.2 Course authoring: create/edit course metadata, pricing, curriculum tree
  (sections → lectures), upload video (delegates to video platform), attach resources.
- FR-5.3 Draft → Submitted → Published → Archived course lifecycle; org-admin review gate
  before first publish.
- FR-5.4 Instructor dashboard: enrollments, revenue, ratings, Q&A inbox across own courses.
- FR-5.5 Announcements to enrolled students of a course.

### 1.6 Org Admin (per-tenant)
- FR-6.1 User management: view/suspend/delete users, role assignment — within own tenant.
- FR-6.2 Course moderation: approve/reject/unpublish, review flagged content — within own
  tenant.
- FR-6.3 Category/taxonomy management (tenant-scoped, with sensible platform defaults).
- FR-6.4 Coupon/sale campaign management.
- FR-6.5 Tenant analytics: signups, revenue, active learners, top courses.
- FR-6.6 Refund/dispute handling console.
- FR-6.7 Branding & subscription plan management (logo, color, subdomain, billing tier).

### 1.7 Platform Super Admin (cross-tenant)
- FR-7.1 Create/approve/suspend tenants; manage tenant subscription plans.
- FR-7.2 Cross-tenant analytics (platform-wide signups, revenue, growth).
- FR-7.3 Audited impersonation of an org admin for support purposes.
- FR-7.4 Global category taxonomy / platform-wide announcements (e.g. maintenance notices).

---

## 2. Non-Functional Requirements

### 2.1 Performance & Scale
- NFR-1.1 Support ~10,000 registered users, ~500 concurrent active sessions at launch,
  across all tenants combined; architecture must scale horizontally without redesign
  (stateless API pods behind a load balancer).
- NFR-1.2 API p95 latency < 300ms for catalog/read endpoints, < 800ms for
  checkout/write endpoints, under target load.
- NFR-1.3 Video playback start < 2s (delegated to CDN-backed video platform).
- NFR-1.4 A single large tenant's query load must not degrade response times for other
  tenants — every tenant-scoped query must hit an index on `tenant_id` (composite indexes,
  e.g. `(tenant_id, created_at)`).

### 2.2 Availability & Reliability
- NFR-2.1 Target 99.5% uptime for v1 (single-region, multi-zone Cloud SQL + multiple
  Cloud Run/GKE replicas).
- NFR-2.2 Graceful degradation: catalog browsing stays read-available even if
  payments/Q&A services are degraded.
- NFR-2.3 Automated daily DB backups, point-in-time recovery (Cloud SQL PITR), tested
  restore procedure.

### 2.3 Security
- NFR-3.1 All traffic over HTTPS/TLS; HSTS enabled.
- NFR-3.2 Passwords hashed with bcrypt/argon2; JWT secrets in Secret Manager, rotated.
- NFR-3.3 OWASP Top 10 mitigations: input validation, parameterized queries (ORM),
  rate limiting on auth/payment endpoints, CSRF protection where applicable.
- NFR-3.4 Payment data never touches our servers directly — use Stripe Checkout/Elements
  (PCI SAQ-A scope only).
- NFR-3.5 File uploads (avatars, resources) virus-scanned or type/size restricted before
  reaching GCS.
- NFR-3.6 Audit log for admin actions (user suspension, course moderation, refunds,
  super-admin impersonation).
- NFR-3.7 Tenant isolation is a hard security boundary: every DB query for tenant-scoped
  models must be filtered by `tenant_id`, enforced centrally (Prisma extension/middleware)
  rather than left to each query — cross-tenant data leakage is treated as a critical bug.
  Automated tests must assert isolation (e.g. tenant A's JWT can never read tenant B's rows).

### 2.4 Data & Compliance
- NFR-4.1 GDPR-style data export/delete on user request.
- NFR-4.2 PII encrypted at rest (Cloud SQL default) and in transit.
- NFR-4.3 Cookie/consent banner if EU users targeted.

### 2.5 Maintainability & DevOps
- NFR-5.1 TypeScript strict mode across frontend and backend; shared lint/format config.
- NFR-5.2 CI pipeline: type-check, lint, test, build on every PR; CD to GCP on merge to main.
- NFR-5.3 Structured logging (JSON) shipped to Cloud Logging; error tracking (e.g. Sentry).
- NFR-5.4 Local dev fully reproducible via Docker Compose (Postgres, Redis, API, web).
- NFR-5.5 Database migrations versioned and reversible via Prisma Migrate.
- NFR-5.6 BullMQ workers run as a separate deployable (own Cloud Run service/container) from
  the API, sharing the Redis instance, so job processing scales independently of request
  traffic.

### 2.6 Observability
- NFR-6.1 Health check endpoints per service for GCP load balancer / uptime checks.
- NFR-6.2 Metrics: request rate, error rate, latency (RED metrics) exported to Cloud
  Monitoring; alerting on error-rate/latency thresholds.
- NFR-6.3 Distributed tracing across API → DB/queue for slow-request diagnosis (optional
  post-launch).

### 2.7 Internationalization / Accessibility (nice-to-have, note for later)
- NFR-7.1 UI text externalized for future i18n (not required v1).
- NFR-7.2 WCAG 2.1 AA target for core learning flows.

---

## 3. Out of Scope (v1)
- Live/synchronous classes, cohorts, scheduled sessions.
- Mobile native apps (web-responsive only).
- Custom domains (CNAME) for tenants — subdomain (`{org}.lumio.app`) only in v1.
- Automated instructor payouts (tracked, not auto-disbursed).
- Advanced proctoring/anti-cheat for quizzes (quizzes themselves are also out of scope for
  v1 unless added later — confirm before backend design).
- Schema-per-tenant or database-per-tenant isolation (row-level `tenant_id` only; revisit if
  a specific enterprise customer requires stronger isolation).

---

## 4. Resolved Decisions
- ORM/DB: PostgreSQL + Prisma.
- Auth: custom JWT (access + refresh), not Auth.js/Clerk/Firebase.
- Search: Postgres full-text search (no Algolia/Meilisearch for v1).
- Async work: BullMQ + Redis (not Kafka — self-hosted Kafka is disproportionate ops overhead
  for this job volume; BullMQ reuses the Redis instance already needed for caching/sessions).
- Tenancy: multi-tenant B2B SaaS, shared DB with row-level `tenant_id` isolation.
- **Tenant billing**: org pays Lumio a platform subscription (seat-based/flat fee),
  *separate from* end-users buying individual courses within that tenant. Both `Subscription`
  (tenant ↔ plan) and `Order` (user ↔ course purchase) exist as distinct models.
- **User ↔ Tenant cardinality**: many-to-many via a `Membership` join table
  (`user_id, tenant_id, role`). A user has one global `User` record but can hold a
  `Membership` — with its own role (student/instructor/org_admin) — in more than one tenant.
  JWT is issued per-session for a specific tenant context (`tenant_id` claim comes from the
  active membership at login, not from the `User` record itself); switching tenants requires
  re-authenticating into that membership's context. `super_admin` is a platform-level flag on
  `User`, not a per-tenant membership role.

- **Quizzes/assignments**: deferred, not in v1 (already noted in §3 Out of Scope).
- **Redis deployment**: single GCP Memorystore instance (Basic tier, no HA) for v1 — accepted
  SPOF at this scale; revisit HA/read-replica tier if uptime requirements tighten post-launch.

## 5. Open Questions for Next Step (System Design)
None outstanding — ready to move to schema design.
