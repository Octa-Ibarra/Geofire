import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { useLanguage } from "../hooks/useLanguage";
import { useLenis } from "../hooks/useLenis";

type SectionId = "problem" | "methodology" | "gallery" | "playground";
const SECTIONS: SectionId[] = ["problem", "methodology", "gallery", "playground"];

/**
 * Top bar with three responsibilities:
 *   - Brand / project tag (left)
 *   - Section nav with smooth-scroll + active highlight (center, hidden on
 *     small screens)
 *   - Language toggle (right)
 *
 * Kept in this file under the old export name to avoid touching App imports.
 */
export function LanguageToggle() {
  const { lang, setLang, t } = useLanguage();
  const lenis = useLenis();
  const [active, setActive] = useState<SectionId | "hero">("hero");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    (["hero", ...SECTIONS] as const).forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = useCallback(
    (id: SectionId | "hero") => {
      const target = document.getElementById(id);
      if (!target) return;
      if (lenis) lenis.scrollTo(target, { offset: id === "hero" ? 0 : -80, duration: 1.4 });
      else target.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [lenis]
  );

  const labels: Record<SectionId, string> = {
    problem: t.sections.problem,
    methodology: t.sections.methodology,
    gallery: t.sections.gallery,
    playground: t.sections.playground,
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-20 border-b border-[#f5f1ea]/10 flex items-center justify-between px-6 md:px-10 z-[100] backdrop-blur-md bg-black/30">
      {/* Brand */}
      <button
        onClick={() => scrollTo("hero")}
        className="flex items-center gap-6 group cursor-pointer"
        aria-label="Go to top"
      >
        <h1 className="text-3xl font-display tracking-tighter text-ember-600 italic group-hover:text-ember-500 transition-colors">
          GeoFire
        </h1>
        <div className="h-8 w-px bg-[#f5f1ea]/20 hidden lg:block" />
        <div className="hidden lg:flex flex-col text-left">
          <span className="text-[10px] uppercase tracking-widest opacity-50 font-mono">
            Proyecto Académico Modelado ML
          </span>
          <span className="text-[11px] font-mono font-bold text-white/80 tracking-widest">
            FIRE SPREAD ML PREDICTOR
          </span>
        </div>
      </button>

      {/* Section nav (centered) */}
      <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2">
        <ul className="flex items-center gap-1">
          {SECTIONS.map((id) => (
            <li key={id}>
              <button
                onClick={() => scrollTo(id)}
                className={`relative px-3 py-2 text-[10px] font-mono uppercase tracking-[0.18em] rounded-full transition-colors duration-300 ${
                  active === id ? "text-ember-400" : "text-white/55 hover:text-white"
                }`}
              >
                {active === id && (
                  <motion.span
                    layoutId="topnav-pill"
                    className="absolute inset-0 rounded-full bg-ember-500/15 border border-ember-500/30 -z-10"
                    transition={{ type: "spring", stiffness: 400, damping: 36 }}
                  />
                )}
                {labels[id]}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Language toggle */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-black/40 border border-[#f5f1ea]/10">
        {(["es", "en"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`relative px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              lang === l ? "text-ember-600" : "text-[#f5f1ea]/40 hover:text-[#f5f1ea]/70"
            }`}
          >
            {lang === l && (
              <motion.div
                layoutId="lang-active"
                className="absolute inset-0 bg-white/5 rounded"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10">{l}</span>
          </button>
        ))}
      </div>
    </header>
  );
}
