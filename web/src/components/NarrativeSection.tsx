import { useLanguage } from "../hooks/useLanguage";
import { motion } from "motion/react";

export function NarrativeSection() {
  const { t } = useLanguage();

  const stats = [
    { label: t.problem.stat1, value: "98" },
    { label: t.problem.stat2, value: "1.771" },
    { label: t.problem.stat3, value: "1.171" },
    { label: t.problem.stat4, value: "20" },
  ];

  return (
    <section id="problem" className="relative min-h-[150vh] py-32 px-6 flex flex-col items-center justify-center bg-transparent overflow-hidden">
      {/* Background Ash Layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-ash-800 to-ash-900 opacity-50" />
      
      <div className="relative z-10 max-w-5xl w-full">
        <header className="mb-24 text-center">
          <span className="text-[10px] uppercase tracking-[0.5em] text-ember-600 font-mono mb-4 block">01 / {t.sections.problem}</span>
          <h2 className="text-6xl md:text-8xl font-display leading-[0.9] tracking-tight">{t.problem.title}</h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-32 items-start">
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-xl md:text-2xl text-white/70 leading-relaxed font-light"
          >
            {t.problem.p1}
          </motion.p>
          <motion.p 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-xl md:text-2xl text-white/70 leading-relaxed font-light"
          >
            {t.problem.p2}
          </motion.p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group p-6 glass-panel rounded-xl hover:border-ember-600/50 transition-all cursor-default"
            >
              <div className="text-3xl md:text-4xl font-mono text-ui-text mb-2 truncate">
                {stat.value}
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#ff8a32] font-bold">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
