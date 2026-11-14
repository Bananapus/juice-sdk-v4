---
"@bananapus/nana-sdk-core": minor
---

Add the shared `.jb` launch draft, version 2 (`v6/jbDraft`): one file juicebox.money, revnet.money and Juicescan read and write. `parseJbDraft`, `checkJbDraft` and `serializeJbDraft` read strictly (an unknown key or a wrong type refuses the file) and fill the keys a short file leaves out; `jbDraftUnsupported` words a site's refusal of a file its form cannot express; the `emptyJbDraft*` helpers give writers the defaults. `jbDraft.vectors.json` pins the format case by case for clients that port it by hand.
