// Axios interceptors (services/api.js) run outside the React tree, so they
// can't call useContext(). ErrorModalContext registers its `showError`
// function here (inside a useEffect, on mount) and api.js calls
// `showGlobalError(...)` directly. Kept in its own plain-JS file — mixing
// this with the Provider component in the same file trips React Fast
// Refresh's "only export components" rule.
let handler = null;

export function registerErrorHandler(fn) {
  handler = fn;
}

export function showGlobalError(payload) {
  handler?.(payload);
}
