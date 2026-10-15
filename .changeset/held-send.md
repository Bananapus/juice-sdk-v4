---
"@bananapus/nana-sdk-core": minor
---

`useHeldSend` (`@bananapus/nana-sdk-core/review/react`, re-exported by nana-sdk-react) runs sends whose call is known only at send time, such as a generic contract write or Safe transaction. Each send goes through its intent's (or exact call's) held-write view, made once and reused, and the hook shows the current send's state, notice and exit as `useHeldWrite` does, so no app creates a held-write view itself.

`view.exit()` now reports a release by another window during the exit as `releasedBy: "other-tab"` ("released elsewhere"), not as the user's.

New intent builders follow the coarse identity rule (identity plus explicit choices, never derived or quoted values): `redeemIntent`, `allowanceIntent`, `burnIntent`, `safeBatchIntent` and `syncIntent`.
