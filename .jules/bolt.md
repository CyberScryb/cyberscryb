## 2026-06-27 - [Optimization of useToolState]

**Learning:** Found that `useToolState` was performing expensive LZString compression on every keystroke to update a `shareUrl` state. This caused visible UI jank in text-heavy tools like the Diff Viewer and JSON Visualizer.
**Action:** Removed `shareUrl` state and moved compression to be on-demand in the `copyShareLink` callback. Also added debounced localStorage sync to further reduce I/O overhead.
