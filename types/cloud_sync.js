// Cloud Sync service typing (high-value boundary)
//
// Goal:
// - Give the cloud-sync service a shared typed surface used by the service,
//   React consumers, and runtime-installed app/service slots.
// - Replace duplicated ad-hoc UI CloudSyncApi shapes and generic runtime bags.
// - Keep payload fields permissive where storage/cloud rows are intentionally
//   backward-compatible and may still carry legacy values.
export {};
