import { useEffect, useState } from "react";
import Lenis from "lenis";
import { LanguageProvider } from "./hooks/useLanguage";
import { LenisContext } from "./hooks/useLenis";
import { HeroScene } from "./components/HeroScene";
import { NarrativeSection } from "./components/NarrativeSection";
import { MetricsPanel } from "./components/MetricsPanel";
import { GallerySection } from "./components/GallerySection";
import { PlaygroundSection } from "./components/PlaygroundSection";
import { Footer } from "./components/Footer";
import { LanguageToggle } from "./components/LanguageToggle";
import { motion, useScroll, useSpring } from "motion/react";
import Spline from "@splinetool/react-spline";

function RootApp() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const instance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      instance.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
    setLenis(instance);

    return () => {
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return (
    <LenisContext.Provider value={lenis}>
      <div className="relative min-h-screen selection:bg-ember-500 selection:text-ash-900 text-[#f5f1ea]">
        {/* Background Spline (Fixed) */}
        <div className="fixed inset-0 z-[-1] bg-black">
          <Spline scene="https://prod.spline.design/bAKa-tkARKSBw3XV/scene.splinecode" />
          <div className="absolute inset-0 bg-ash-900/40" />
        </div>

        {/* Progress Bar */}
        <motion.div
          className="fixed top-0 left-0 right-0 h-1 bg-ember-600 z-[100] origin-left"
          style={{ scaleX }}
        />

        <LanguageToggle />

        <main>
          <HeroScene />

          <NarrativeSection />
          <MetricsPanel />
          <GallerySection />
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ash-900/40 to-transparent z-10 pointer-events-none" />
            <PlaygroundSection />
          </div>
          <Footer />
        </main>

        {/* Cinematic Grain/Noise Overlay */}
        <div className="fixed inset-0 pointer-events-none z-[9998] opacity-[0.03] mix-blend-overlay">
          <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <filter id="noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
            </filter>
            <rect width="100" height="100" filter="url(#noise)" />
          </svg>
        </div>

        {/* Vignette Overlay */}
        <div className="fixed inset-0 pointer-events-none z-[999] shadow-[inset_0_0_15vw_rgba(0,0,0,0.8)]" />
      </div>
    </LenisContext.Provider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <RootApp />
    </LanguageProvider>
  );
}
