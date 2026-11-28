import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

// Keeps a piece of page state (the open tab, sub-tab, page number, selected item...) in the URL,
// e.g. /adminhome?tab=people&people=students. Refreshing the page or sharing the link
// re-opens the same view instead of falling back to the default tab.
//
//   const [tab, setTab] = useUrlState('tab', 'school', ['school', 'people']);
//
// `allowed` (optional) guards against stale or hand-edited URLs: unknown values fall back to the default.
// URL changes made during the current tick, shared by every useUrlState hook (see setValue).
let pendingParams = null;

export function useUrlState(key, defaultValue, allowed) {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const value = raw !== null && (!allowed || allowed.includes(raw)) ? raw : defaultValue;

  const setValue = useCallback((next) => {
    // React Router's functional setParams does NOT queue: several calls in one event handler
    // (e.g. setDept(x); setPage(1)) all start from the same old URL, so the last one wins and
    // the earlier changes are lost. Collect every change made in the same tick into one shared
    // set of params and send the merged result each time.
    if (!pendingParams) {
      pendingParams = new URLSearchParams(window.location.search);
      queueMicrotask(() => { pendingParams = null; });
    }
    if (next === null || next === undefined || next === '' || next === defaultValue) pendingParams.delete(key);
    else pendingParams.set(key, String(next));
    setParams(new URLSearchParams(pendingParams), { replace: true });
  }, [key, defaultValue, setParams]);

  return [value, setValue];
}

// Same as useUrlState for a 1-based page number.
export function useUrlPage(key) {
  const [raw, setRaw] = useUrlState(key, '1');
  const page = Math.max(1, Number.parseInt(raw, 10) || 1);
  const setPage = useCallback((next) => setRaw(String(next)), [setRaw]);
  return [page, setPage];
}
