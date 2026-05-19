import { useLanguage } from "../hooks/useLanguage";
import { motion, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState } from "react";

/**
 * Hero with a panoramic video background.
 *
 * The source `/incendio-360.mp4` is a 360 equirectangular video. We render
 * it as a plain `<video>` HTML element scaled larger than the viewport, then
 * pan it horizontally as the user scrolls. Because the source is a panorama,
 * sliding it sideways IS the rotation effect — visually it looks like the
 * camera is turning inside the scene. This avoids every R3F / Suspense /
 * VideoTexture pitfall.
 *
 * If the video file is unavailable, the radial-gradient fallback fills the
 * frame so the section is never blank.
 */
export function HeroScene() {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoOk, setVideoOk] = useState(false);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // -- Pan & scale driven by scroll progress --------------------------------
  // The video is bigger than the viewport (scale 1.6) so we have ~60% extra
  // horizontal headroom. As progress goes 0 → 1, we slide it from -30% to
  // +30% of its width, which feels like rotating ~180° inside the panorama.
  const videoX = useTransform(scrollYProgress, [0, 1], ["-30%", "30%"]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1.6, 1.85]);

  const titleColor = useTransform(scrollYProgress, [0.3, 0.8], ["#ffffff", "#ff8a32"]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const sceneOpacity = useTransform(scrollYProgress, [0.8, 1], [1, 0]);
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onCanPlay = () => {
      setVideoOk(true);
      v.play().catch(() => {
        /* autoplay blocked — fallback gradient remains */
      });
    };
    const onError = () => setVideoOk(false);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
    };
  }, []);

  return (
    <section id="hero" ref={containerRef} className="relative h-[250vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-transparent flex flex-col items-center justify-center p-10 text-center z-0">
        {/* Fullscreen panning video */}
        <motion.div style={{ opacity: sceneOpacity }} className="absolute inset-0 z-0 bg-black overflow-hidden">
          <motion.video
            ref={videoRef}
            src="/incendio-360.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            style={{ x: videoX, scale: videoScale }}
            className="absolute inset-0 w-full h-full object-cover origin-center"
          />

          {!videoOk && (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,#5a1d0a_0%,#1a0b08_45%,#000_85%)] pointer-events-none" />
          )}

          {/* Color grading */}
          <div className="absolute inset-0 bg-gradient-to-t from-ember-900/40 via-transparent to-black/30 mix-blend-multiply pointer-events-none" />
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
        </motion.div>

        <motion.div
          style={{ opacity: sceneOpacity }}
          className="absolute inset-0 z-10 pointer-events-none shadow-[inset_0_0_25vw_rgba(0,0,0,0.9)]"
        />

        {/* Embers */}
        <motion.div
          style={{ opacity: sceneOpacity }}
          className="absolute inset-0 z-10 pointer-events-none"
        >
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-[#ffaa00] rounded-full blur-[1px] shadow-[0_0_8px_#ff4e00]"
              initial={{
                x: Math.random() * 100 + "vw",
                y: "110vh",
                scale: Math.random() * 1.5 + 0.5,
              }}
              animate={{
                y: "-10vh",
                opacity: [0, 1, 1, 0],
                x: Math.random() * 100 + "vw",
              }}
              transition={{
                duration: 4 + Math.random() * 8,
                repeat: Infinity,
                ease: "linear",
                delay: Math.random() * 10 * -1,
              }}
            />
          ))}
        </motion.div>

        {/* Hero title */}
        <motion.div
          style={{ y: titleY }}
          className="relative z-20 flex flex-col items-center select-none pointer-events-none transition-transform duration-700"
        >
          <motion.h1
            style={{ color: titleColor }}
            className="text-[12vw] leading-none tracking-tight uppercase font-medium drop-shadow-[0_4px_20px_rgba(0,0,0,1)] transition-colors duration-200"
          >
            {t.hero.title}
          </motion.h1>

          <p className="mt-8 text-xl md:text-3xl tracking-[0.2em] uppercase font-bold text-[#f5f1ea] drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
            {t.hero.subtitle}
          </p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          style={{ opacity: scrollIndicatorOpacity }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-30"
        >
          <span className="text-[10px] uppercase tracking-[0.3em] font-mono text-white/70 drop-shadow-[0_0_5px_rgba(0,0,0,1)]">
            {t.hero.scroll}
          </span>
          <div className="w-px h-12 bg-gradient-to-b from-white/70 to-transparent drop-shadow-[0_0_5px_rgba(0,0,0,1)]" />
        </motion.div>
      </div>
    </section>
  );
}
