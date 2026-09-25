---
"@bananapus/nana-sdk-core": minor
---

`@bananapus/nana-sdk-core/v6` reads and writes Sticky splits. A split pays
Sticky holders when its `hook` is the chain's `StickyDistributor`, its
`beneficiary` is the Sticky token, and its `projectId` is the reward group.

- `stickyDistributorAddress(chainId)` and `isStickySplit(split, chainId)`
- `stickyGroupId({ minWeeks, maxWeeks })` encodes a tenure group as
  `minWeeks * 1000 + maxWeeks`; `maxWeeks` 0 means no upper bound
- `decodeStickyGroupId(groupId)` returns `{ kind: "default" }` or
  `{ kind: "tenure", minWeeks, maxWeeks }`; an invalid ID decodes as the
  default group, which is what the distributor funds
- `validateStickyGroupId(groupId)` returns a reason or null, matching
  `StickyDistributor.isValidGroupId`
- `describeStickySplit(split)` gives short text for confirm dialogs and
  activity rows, like "Sticky holders stuck 4 to 52 weeks"
- `STICKY_DEFAULT_GROUP_ID`, `STICKY_CRITERIA_BASE`, `STICKY_MAX_CRITERIA_WEEKS`
