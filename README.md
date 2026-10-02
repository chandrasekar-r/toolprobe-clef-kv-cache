# toolprobe-clef-kv-cache

Clef-flash tool-call **precheck** wrapped with **Workers KV** cache (HIT/MISS).

> Decision-model precheck — not tool-calling pass/fail.

**Live (canonical):** https://clef-kv.rclabs.in

Related (no KV): https://clef-precheck.rclabs.in

Also attached: https://toolprobe-clef-kv-cache.rclabs.in (alias). Prefer short host `clef-kv` in X copy.

Legacy workers.dev still works but posts should use `*.rclabs.in`.

## API

`POST /precheck` or `POST /` with:

```json
{ "state": "string", "tools": ["a", "b"], "threshold": 0.6 }
```

Returns `should_call`, `tool`, `confidence`, `cache` (`HIT`|`MISS`), `latency_ms_total`, `latency_ms_model`.

## Measured smoke (2026-10-02 on clef-kv.rclabs.in)

| | cache | latency_ms_total | latency_ms_model | should_call | tool | confidence |
|---|---|---:|---:|---|---|---:|
| 1st | MISS | 842 | 466 | true | get_weather | 0.7964 |
| 2nd | HIT | 3 | 0 | true | get_weather | 0.7964 |

Uses **regular Workers KV**. KV Instant still private beta here.

## Curl

```bash
URL=https://clef-kv.rclabs.in/precheck
PAYLOAD='{"state":"User: What is the weather in Berlin right now?","tools":["get_weather","search_web","send_email"],"threshold":0.6}'
curl -sS "$URL" -H 'content-type: application/json' -d "$PAYLOAD"
curl -sS "$URL" -H 'content-type: application/json' -d "$PAYLOAD"
```
