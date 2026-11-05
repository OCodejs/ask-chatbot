# Conductor: parallel specialist agents

Ask OCode.js exposes an opt-in `conductor` model route for coordinated software-engineering analysis.

## Execution model

- The planner creates four specialist tasks: review, security, performance, and architecture.
- Configured remote provider adapters are assigned to tasks round-robin. The local canned `zsk` demo agent is excluded so Conductor cannot present placeholder replies as real specialist analysis.
- The executor runs tasks concurrently with a bounded worker pool.
- `AGENT_MAX_CONCURRENCY` controls the limit (default 4, clamped to 1–8).
- A failed specialist is reported without discarding successful results from other specialists.
- The API returns one Markdown report with the provider used for each specialist.

## Enable it

Set `DEFAULT_MODEL=conductor` to make it the default route, or send `model: "conductor"` to `POST /api/chat`.

Only remote providers with their required server-side credentials/configuration are considered enabled. If none are configured, Conductor returns a setup message instead of fabricating specialist results. Provider keys must remain in Vercel Environment Variables or another server-side secret store.

## Safety boundary

This first implementation is a parallel analysis/orchestration layer. It does not create Git worktrees, execute shell commands, edit project files, commit changes, open pull requests, or deploy applications. Those capabilities require a separate isolated workspace runner with explicit filesystem, network, command, and approval policies.

The existing `all` route remains unchanged. It invokes the legacy workflow and must not be confused with the read-only `conductor` route.
