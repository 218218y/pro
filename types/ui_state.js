// UI slice typed spine (React-facing)
//
// Goal:
// - Provide a stable, typed surface for the UI slice as consumed by React.
// - Keep this focused on high-value fields and allow extension via an index signature.
//
// Notes:
// - This does NOT attempt to fully type every UI key in the legacy system.
// - Prefer UnknownRecord over loose record bags to prevent `any` bleed into React.
export {};
