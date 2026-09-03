---
"@bananapus/nana-sdk-core": patch
---

`projectIdFromLaunchLogs` / `decodeLaunchProjectId` now recognise projects launched through a deployer. `JBOmnichainDeployer` creates the project via `JBProjects.createFor` and then calls `launchRulesetsFor`, so the controller emits `LaunchRulesets` rather than `LaunchProject`; both are decoded from the canonical controller, and `JBProjects.Create` from the canonical `JBProjects` is accepted as well since every launch path emits it. Previously an omnichain launch receipt decoded to `null`.
