---
"@bananapus/nana-sdk-core": major
---

`resolveSuckers` and `getSuckerPairs` read Juicebox V6 only and load only the v6 address table. An app's page that imports `resolveSuckers` drops from 10,488 B to 5,002 B gzip. `version` is optional and accepts only `6`; a V4 or V5 read is refused before any call. V6 results are unchanged.
