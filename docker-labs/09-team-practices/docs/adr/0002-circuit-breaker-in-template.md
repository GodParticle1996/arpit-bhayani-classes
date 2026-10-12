# ADR-0002: Har outgoing client mein default circuit breaker

**Status:** accepted (template 1.3.0)

## Context
Diwali 2023: tax-service hang → pricing, order, gateway threads full → 10 minute poori app down.

## Decision
Template ke HTTP/gRPC clients mein breaker default on (threshold 50% / 20 requests, open 10 s, half-open 3 trials).

## Kyun
Har team ko alag se yaad rakhna nahi padega; postmortem ka action item code mein.

## Consequences
- Har dependency ke liye fallback tay karna zaroori (template warning deta hai).
- Opt-out sirf RFC se.
