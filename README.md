# toolprobe-clef-kv-cache

Clef-flash tool-call **precheck** wrapped with **Workers KV** cache (HIT/MISS).

> Decision-model precheck — not tool-calling pass/fail.

Live: https://toolprobe-clef-kv-cache.rcgpt.workers.dev

Related (no KV): https://toolprobe-clef-precheck.rcgpt.workers.dev

## API

`POST /precheck` or `POST /` with:

```json
{ "state": "string", "tools": ["a", "b"], "threshold": 0.6 }
```

Returns `should_call`, `tool`, `confidence`, `cache` (`HIT`|`MISS`), `latency_ms_total`, `latency_ms_model`.

Cache key: `sha256` of stable `{state, tools sorted, threshold}`.

## Measured smoke (2026-10-02)

Same Berlin weather payload, twice:

| | cache | latency_ms_total | latency_ms_model |
|---|---|---:|---:|
| 1st | MISS | 973 | 635 |
| 2nd | HIT | 5 | 0 |

Uses **regular Workers KV**. KV Instant (~2ms Birthday Week) was not available on this account via API (private beta) — Instant is the upgrade path when enabled.

## Curl

```bash
URL=https://toolprobe-clef-kv-cache.rcgpt.workers.dev/precheck
PAYLOAD='{"state":"User: What is the weather in Berlin right now?","tools":["get_weather","search_web","send_email"],"threshold":0.6}'
curl -sS "$URL" -H 'content-type: application/json' -d "$PAYLOAD"
curl -sS "$URL" -H 'content-type: application/json' -d "$PAYLOAD"
```
