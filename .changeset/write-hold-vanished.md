---
"@bananapus/nana-sdk-core": patch
---

No dead end for a seen hash that vanished (ruling R119).

- A wallet hash seen with its sent nonce that the node has since answered as not found, continuously for 30 minutes, with the account's nonce still unused at a canonical finalized block, now gets `held-unchecked` with the exit and the warning. Before, it was held forever, although wallets often stop showing a dropped transaction.
- The clock is kept on the record (`vanishedAt`), so it survives a reload, and is cleared whenever an authenticated hash is seen again, on every path (in the mempool, mined with its receipt not yet readable, or a speed-up adopted at its sent nonce). The exit rechecks: a hash that reappears or mines is followed, not released.
- A finalized nonce past the sent nonce keeps the dropped-proof rules, and a node or finalized block that can't answer offers no exit.
