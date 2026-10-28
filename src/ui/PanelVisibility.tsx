import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// The only signal MainTabs' floating relief button needs from whatever tab is focused: is a
// bottom-docked FloatingPanel currently covering the bottom of the screen? Today only Home has
// one (its daily check-in dialogue), but this is generic rather than "isHomePanelOpen" so a
// future tab's own bottom panel can report through the same channel without new plumbing.
const PanelVisibilityContext = createContext<((open: boolean) => void) | null>(null);

export function PanelVisibilityProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <PanelVisibilityContext.Provider value={setOpen}>
      {/* exposes the read side via a second context so the setter identity above never changes */}
      <PanelOpenContext.Provider value={open}>{children}</PanelOpenContext.Provider>
    </PanelVisibilityContext.Provider>
  );
}

const PanelOpenContext = createContext(false);

/** Read side, for MainTabs: is some tab's bottom panel covering the screen right now? */
export function useBottomPanelOpen() {
  return useContext(PanelOpenContext);
}

/** Write side, for a screen with its own bottom FloatingPanel (e.g. HomeScreen): report whether
 * it's currently showing. Resets to false on unmount so a stale "open" can't linger.
 * `setOpen` (a useState setter) has a stable identity, so this is safe as an effect dependency. */
export function useReportBottomPanel(open: boolean) {
  const setOpen = useContext(PanelVisibilityContext);
  useEffect(() => {
    setOpen?.(open);
  }, [open, setOpen]);
  // Separate effect, unmount-only cleanup — folding this into the one above would re-fire a
  // spurious "closed" on every `open` change (its cleanup runs before each re-run), not just
  // when the screen actually goes away.
  useEffect(() => () => setOpen?.(false), [setOpen]);
}
