---
"@bananapus/nana-sdk-core": minor
---

Add shared destination sucker mint readiness and durable reviewed-write recovery so clients refuse currently unmintable bridge routes and retain uncertain wallet submissions across retries. Preserve Safe proposal uncertainty until authenticated execution or expiry evidence is available, bind deadline expiry to canonical contracts, and refuse collector qualification for native Arbitrum L1 sends whose asynchronous refunds cannot be recovered. Recognize native Arbitrum L2 routes with their canonical zero-inbox and gateway configuration.
