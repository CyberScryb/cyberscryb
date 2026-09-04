# PostHog Self-driving Setup Report

_Generated: 2026-08-30 — CyberScryb (project 570951)_

## Summary

PostHog Self-driving has been configured for CyberScryb. Session Replay, Error Tracking, and Support (Conversations) products are enabled; six native signal sources are wired to the inbox; the scout troop is tuned to five active scouts; and two Replay Vision monitors are armed and emitting signals. Findings will start appearing in the [Self-driving inbox](https://us.posthog.com/project/570951/inbox) within ~30 minutes.

---

## AI data processing

**Approved.** Organization-level AI data processing consent was granted before this run started (enforced by the wizard's opt-in gate).

---

## GitHub

**Connected during this run.** GitHub App installed for the `CyberScryb` org (integration ID 259151, connected by Nathaniel Ady). Self-driving can now read the repo to research findings and open fix PRs.

---

## Products enabled

| Product                 | Status           | Notes                                                                                                              |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Session Replay          | Already enabled  | Server-side flag was already on. No posthog-js on the frontend — no recordings yet; see Follow-ups.                |
| Error Tracking          | Already enabled  | posthog-node init has `enableExceptionAutocapture: true` and `captureException` is called in `functions/index.js`. |
| Support (Conversations) | Enabled this run | Newly turned on. Tickets only arrive once an inbound channel is connected — see Follow-ups.                        |

This project uses posthog-node for server-side event capture in Firebase Functions. There is no posthog-js frontend integration, so the session replay server flip is inert until posthog-js is added to the browser-side (cyberscryb.com).

---

## Signal sources

| source_product   | source_type                | Action        | Notes                                                                       |
| ---------------- | -------------------------- | ------------- | --------------------------------------------------------------------------- |
| `health_checks`  | `health_issue`             | Enabled       | Watches for instrumentation issues — always on.                             |
| `error_tracking` | `issue_created`            | Enabled       | New error issues reach the inbox.                                           |
| `error_tracking` | `issue_reopened`           | Enabled       | Reopened errors reach the inbox.                                            |
| `error_tracking` | `issue_spiking`            | Enabled       | Error rate spikes reach the inbox.                                          |
| `conversations`  | `ticket`                   | Enabled       | Dormant until an inbound channel is connected.                              |
| `session_replay` | `session_analysis_cluster` | Enabled       | Sample rate 0.1. Dormant until posthog-js is added to the frontend.         |
| `signals_scout`  | `cross_source_issue`       | On by default | Scout findings reach the inbox without a config row — no row created.       |
| `llm_analytics`  | —                          | Skipped       | Not a user-facing responder.                                                |
| `logs`           | —                          | Skipped       | Not a v1 responder.                                                         |
| `replay_vision`  | —                          | Skipped       | Scanners are self-authorizing via `emits_signals` (step 6c); no row needed. |

---

## Connected tools

No external tool sources were selected. The connected-tools question was cancelled; no issue tracker, support desk, or other external source was connected. Follow-up below if you'd like to add any.

---

## Scout troop

**Budget:** 100 runs/day (early-access default), 0 used today. Banner: _"Scouts are in early access. Each project gets up to 100 scout runs a day. Contact team-self-driving@posthog.com if you need more."_

### Active scouts (5)

| Scout                              | What it watches                                                                                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `signals-scout-general`            | Cross-product correlations; surfaces no specialist covers. Always on.                                                                                                             |
| `signals-scout-product-analytics`  | Saved funnel/retention/lifecycle flows for conversion regressions. Enabled because posthog-node is actively tracking `ai_tool_used`, `email_captured`, `pro_unlocked`.            |
| `signals-scout-revenue-analytics`  | Stripe sync stalls, `pro_unlocked` capture regressions, goal-miss escalations. Enabled because Stripe is the payment processor and `pro_unlocked` events fire with currency data. |
| `signals-scout-health-checks`      | PostHog health issues weighted by blast radius. Enabled because this is a fresh setup.                                                                                            |
| `signals-scout-observability-gaps` | Events with no insight, dashboard, or alert coverage. Enabled because tracked events (`ai_tool_used`, `rate_limit_exceeded`, etc.) have no PostHog insights yet.                  |

### Disabled scouts (22)

| Scout                              | Reason disabled                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `signals-scout-error-tracking`     | Covered by the native error tracking source (step 4) — would duplicate findings.                              |
| `signals-scout-session-replay`     | Covered by the native session replay source (step 4) — would duplicate findings.                              |
| `signals-scout-ai-observability`   | No `$ai_*` events or LLM SDK in use — surface not active. Enable if AI observability events are added.        |
| `signals-scout-apm`                | No OpenTelemetry / distributed tracing in use.                                                                |
| `signals-scout-anomaly-detection`  | No saved dashboards/insights yet for it to baseline against. Enable once insights exist.                      |
| `signals-scout-conversations`      | Conversations just enabled — no channel or ticket data yet. Enable once support is in use.                    |
| `signals-scout-csp-violations`     | No CSP reporting configured on the frontend.                                                                  |
| `signals-scout-customer-analytics` | No group / accounts analytics (B2B) in use.                                                                   |
| `signals-scout-data-pipelines`     | No CDP destinations, batch exports, or hog flows configured.                                                  |
| `signals-scout-data-warehouse`     | No warehouse imports configured.                                                                              |
| `signals-scout-experiments`        | No active A/B experiments. Enable if experiments are launched.                                                |
| `signals-scout-feature-flags`      | No feature flags found in the codebase. Enable if flags are introduced.                                       |
| `signals-scout-inbox-validation`   | No shipped fixes for it to validate yet (fresh setup).                                                        |
| `signals-scout-insight-alerts`     | No configured insight alerts yet.                                                                             |
| `signals-scout-logs`               | PostHog logs product not in use.                                                                              |
| `signals-scout-mcp-tool-calls`     | No `$mcp_tool_call` telemetry.                                                                                |
| `signals-scout-observability-gaps` | (See active — this is enabled.)                                                                               |
| `signals-scout-replay-vision`      | Reads trends _across_ accumulated observations; no observations exist yet. Enable once recordings accumulate. |
| `signals-scout-revenue-analytics`  | (See active — this is enabled.)                                                                               |
| `signals-scout-skills-store`       | Skill hygiene scout — not a product surface for CyberScryb.                                                   |
| `signals-scout-surveys`            | No surveys in use (0 surveys in project).                                                                     |
| `signals-scout-tasks`              | No PostHog Tasks in use.                                                                                      |
| `signals-scout-web-analytics`      | No posthog-js frontend; no `$pageview` events from the browser. Enable once posthog-js is added.              |
| `signals-scout-web-vitals`         | No `$web_vitals` events. Enable once posthog-js with web vitals is added.                                     |

---

## Custom scouts

Two custom scouts were proposed; the user's selection included "None — keep the built-in troop," so no custom scouts were created. They remain valid proposals for a later session:

| Proposed scout                       | Surface                                           | Discriminator                                    | Why not covered by built-in troop                                                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `signals-scout-ai-tool-failure-rate` | `ai_generation_failed` vs `ai_tool_used` per tool | Failure rate above 7-day per-tool baseline       | `product-analytics` watches saved funnel _rates_, not raw event ratios; `revenue-analytics` watches Stripe/`pro_unlocked`; error-tracking native source watches `$exception`, not application-level failures |
| `signals-scout-pro-conversion`       | `email_captured` → `pro_unlocked` conversion rate | Conversion rate below prior 7-day rolling window | `revenue-analytics` watches Stripe stalls, not email→Pro conversion; `product-analytics` needs saved flows (none exist yet)                                                                                  |

**Noise escape hatch:** if any future scout turns noisy, set `emit: false` on its config in PostHog to switch it to dry-run without disabling it.

---

## Replay Vision scanners

A scanner is an LLM that watches individual session recordings on a schedule and pushes what it observes directly to the Self-driving inbox. Findings arrive at half weight; a full-weight corroborated finding promotes into a report. The scanners below are the only things in this setup that spend Replay Vision quota. The project has no recordings yet — both scanners are armed and start working the day posthog-js is added to the frontend.

| Scanner                                  | Type    | Watches                                                                                                                  | Query scope                                    | Sampling | Est. monthly credits  |
| ---------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | -------- | --------------------- |
| **AI tool and Pro upgrade failures**     | Monitor | Visible product breakage: blank AI output, failed Stripe redirect, silent email capture failure, broken Pro success page | Sessions with `$current_url` containing `/pro` | 0.5      | 0 (no recordings yet) |
| **Tool paywall and generation friction** | Monitor | User frustration signals: rage-clicking submit buttons, paywall dismiss hammering, copy-clipboard failures               | Sessions with a `$rageclick` event             | 1.0      | 0 (no recordings yet) |

Both have `emits_signals: true` — findings reach the inbox automatically once recordings exist.

---

## Follow-ups

- [ ] **Add posthog-js to the cyberscryb.com frontend.** Required for session replay, browser autocapture, web analytics, and web vitals. Without it, the session replay source, the two Replay Vision scanners, and the web-analytics/web-vitals scouts all stay idle.
- [ ] **Connect a Conversations inbound channel** (email, inbox, or Slack) in PostHog → Settings → Conversations so support tickets reach the inbox. The `conversations/ticket` responder is already enabled and waiting.
- [ ] **Create saved funnels in PostHog** (e.g. `email_captured` → `pro_unlocked`, `ai_tool_used` → `pro_unlocked`) so `signals-scout-product-analytics` has flows to watch.
- [ ] **Consider connecting issue trackers** (GitHub Issues, Linear, Jira, etc.) to feed the inbox with open issues Self-driving can auto-fix as draft PRs. Visit [connected-tool sources](https://us.posthog.com/project/570951/pipeline/new/source) to add them.
- [ ] **Add the two proposed custom scouts** in a later session if desired: `signals-scout-ai-tool-failure-rate` (AI generation failure rate per tool) and `signals-scout-pro-conversion` (email→Pro conversion rate). Both are ready to create — the gap analysis and discriminators are documented above.
- [ ] **Enable `signals-scout-web-analytics`** once posthog-js is on the frontend and `$pageview` events start flowing.
- [ ] **Enable `signals-scout-replay-vision`** once session recordings accumulate (it reads trends across observations; there are none yet).

---

## What happens next

The scout coordinator picks up fresh configs within ~30 minutes; the first scans draw from the 100 runs/day early-access budget. Findings cluster into reports in the [inbox](https://us.posthog.com/project/570951/inbox). Immediately-actionable ones can start coding tasks directly from the inbox. The two Replay Vision scanners activate the day recordings begin — no second setup needed.
