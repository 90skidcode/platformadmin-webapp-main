import * as React from "react";

/** Mirrors Radix's `Presence`: keeps a node mounted through its exit
 * animation/transition instead of unmounting the instant `present` flips to
 * false, so `data-[state=closed]:animate-out`-style CSS actually gets a
 * chance to play instead of the element just vanishing. Unmounts
 * immediately if the node has no real animation/transition running --
 * jsdom never fires `animationend`/`transitionend`, so tests see an
 * instant unmount, same as they would against Radix's own Presence. */
export function usePresence(present: boolean) {
  const [rendered, setRendered] = React.useState(present);
  const nodeRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (present) {
      setRendered(true);
      return;
    }
    const node = nodeRef.current;
    if (!node) {
      setRendered(false);
      return;
    }
    const styles = getComputedStyle(node);
    const hasExitAnimation =
      styles.animationName !== "none" ||
      parseFloat(styles.transitionDuration) > 0;
    if (!hasExitAnimation) {
      setRendered(false);
      return;
    }
    function finish() {
      setRendered(false);
    }
    node.addEventListener("animationend", finish);
    node.addEventListener("transitionend", finish);
    return () => {
      node.removeEventListener("animationend", finish);
      node.removeEventListener("transitionend", finish);
    };
  }, [present]);

  return { rendered, nodeRef };
}
