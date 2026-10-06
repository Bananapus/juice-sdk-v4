---
"@bananapus/nana-sdk-core": minor
---

`requestPersistedBendystraw` on `@bananapus/nana-sdk-core/bendystraw-operations`
takes a `signal`. When the signal aborts, the request under way fails with the
signal's reason and is not retried, and a signal that has already aborted sends
nothing. A page that was left could not end a read it had started: it ran until
it answered or timed out.

- Sticky's `web/src/lib/bendystraw-browser.ts` exists only to pass a signal to
  this request. It can be deleted, and Sticky can call the SDK's function.
- Juicebox Money's and Homerun's `bendystraw()` can take a `signal` option and
  pass it on, to this function in the browser and to `requestBendystraw` on the
  server.

`resolvePersistedBendystrawRequest` is unchanged. Each of its refusals is now
pinned by its own test here, so an app's tests of its relay need no copy of that
table.
