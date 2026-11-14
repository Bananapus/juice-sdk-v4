---
"@bananapus/nana-sdk-core": minor
---

`prepareBestUserPay` takes `simulateFrom`: with it, each native-token route is run as a call funded for that account, and the route that delivers the most project tokens wins. A route whose call reverts is dropped. The exact figures decide only when every remaining route ran; otherwise the terminals' own previews decide as before. The result carries `simulatedTokenCount` when the chosen route ran.

`payNoticeView` (from `v6/payNotice`) is the rule for the payment notice a payer is shown: the notice of the chain being paid, the project's other chains whose notice reads differently, and whether the paid chain's notice could not be read.
