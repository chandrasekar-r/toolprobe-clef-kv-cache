# toolprobe-clef-kv-cache

Cloudflare Worker: **Clef-flash** tool-call precheck with **Workers KV** response cache (HIT/MISS).

Sibling of [toolprobe-clef-precheck](https://github.com/chandrasekar-r/toolprobe-clef-precheck).

> **decision-model precheck, not tool-calling pass/fail**

## Public demo

`https://toolprobe-clef-kv-cache.rcgpt.workers.dev`

## KV

**Regular Workers KV** (namespace id `eef0c311d872474fbe3c9688ef75148d`).  
**KV Instant** (~2ms) was not available via account/API (private beta). Instant is the Birthday Week upgrade path when enabled — same Worker, swap binding.

## API

`POST /precheck` or `POST /` with `{ "state", "tools": [], "threshold?" }`.

Cache key: `sha256` of stable `{ state, tools(sorted), threshold }`.

Response adds `cache` (`HIT`|`MISS`), `latency_ms_total`, `latency_ms_model` (0 on HIT), plus `should_call`, `tool`, `confidence`, `model`, `details`.

`GET /` — help + curl example.

## Curl

```bash
curl -sS https://toolprobe-clef-kv-cache.rcgpt.workers.dev/precheck \
  -H 'content-type: application/json' \
  -d '{"state":"User: What is the weather in Berlin right now?","tools":["get_weather","search_web","send_email"],"threshold":0.6}'
```

Same payload twice → MISS then HIT.

## Smoke (measured 2026-10-02, Europe/Berlin)

| | cache | latency_ms_total | latency_ms_model |
|--|--|--|--|
| 1st | MISS | **700** | 406 |
| 2nd | HIT | **4** | 0 |

Measured on live Worker only — not blog/marketing figures.

## Bindings

- `AI` → Workers AI (`@cf/cloudflare/clef-flash`)
- `CACHE` → KV `toolprobe-clef-kv-cache`
