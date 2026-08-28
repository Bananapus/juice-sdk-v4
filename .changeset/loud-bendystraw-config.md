---
"@bananapus/nana-sdk-react": major
---

`useBendystrawQuery` (and every hook built on it, including `useSuckers`) now throws when no Bendystraw config is in context instead of silently staying disabled. Wrap the tree in `JBProjectProvider` with a `bendystraw={{ apiKey }}` prop.
