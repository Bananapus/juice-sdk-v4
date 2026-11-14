---
"@bananapus/nana-sdk-core": minor
---

Add the shared `.jb` launch draft, version 2 (`v6/jbDraft`): one file juicebox.money, revnet.money and Juicescan read and write. `parseJbDraft`, `checkJbDraft` and `serializeJbDraft` read strictly (an unknown key or a wrong type refuses the file) and fill the keys a short file leaves out; `jbDraftUnsupported` words a site's refusal of a file its form cannot express; the `emptyJbDraft*` helpers give writers the defaults. `jbDraft.vectors.json` pins the format case by case for clients that port it by hand.

The known address names now include Croptop's project deployer (`CTDeployer`), one address on every chain, exported as `CROPTOP_DEPLOYER_ADDRESS`.

`prepareBestUserPay` prepares a payment on every terminal the caller lists and returns the one that gives the beneficiary the most project tokens, so every client chooses a pay route the same way.

`auditProjectContracts` (from `review/decode`) checks the controller, terminals, routed terminal and hooks a project points at against the known deployments, and says when a read failed instead of reporting a clean project.
