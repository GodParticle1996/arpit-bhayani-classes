# ADR-0001: Users ke liye REST, services ke beech gRPC

**Status:** accepted (template 1.0.0)

## Context
Mobile/web clients ko simple, debuggable HTTP + JSON chahiye. Services ke beech 4,000+ calls/second, strict contracts ki zaroorat.

## Decision
External APIs REST + JSON. Internal service-to-service gRPC (protobuf) — deadlines aur streaming ke saath.

## Kyun (data)
`npm run bench` (is lab mein): payload ~6× chhota, client CPU kuch kam, par localhost par p50 latency lagbhag barabar. Faayda bandwidth aur CPU bill mein hai, aur protobuf ke strict contracts mein — latency mein nahi jab downstream kaam 150 ms ka ho. Isliye gRPC high-volume internal paths ke liye; baaki jagah REST bhi allowed.

## Consequences
- Proto files ka central repo, versioning niyam.
- Debugging ke liye grpcurl template mein.

## Badalna ho toh
RFC likho (`npm run rfc "<title>"`), guild meeting mein rakho.
