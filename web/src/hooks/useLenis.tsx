import { createContext, useContext } from "react";
import type Lenis from "lenis";

/**
 * Shared Lenis instance. The provider is created in `App.tsx` where the
 * smooth-scroll engine is initialised; consumers (e.g. the top nav) use this
 * to drive programmatic scroll-to-anchor with the same easing as the wheel.
 */
export const LenisContext = createContext<Lenis | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}
