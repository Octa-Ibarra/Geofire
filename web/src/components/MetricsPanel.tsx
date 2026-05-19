import { useEffect, useState } from "react";
import { api, Metrics } from "../services/api";
import { useLanguage } from "../hooks/useLanguage";
import { motion } from "motion/react";
import { Activity, Target, Maximize, MapPin, Percent } from "lucide-react";

export function MetricsPanel() {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    api.getMetrics().then(setMetrics).catch(console.error);
  }, []);

  if (!metrics) return null;

  const cards = [
    { label: "Mask IoU", val: metrics.test.mask_iou.toFixed(3), icon: Target, color: "text-emerald-500" },
    { label: "Poly IoU", val: metrics.test.poly_iou.toFixed(3), icon: Maximize, color: "text-blue-500" },
    { label: "Centroid Δ (m)", val: metrics.test.centroid_disp_m.toFixed(1), icon: MapPin, color: "text-amber-500" },
    { label: "IoU > 0.5 (%)", val: (metrics.test.pct_iou_gt_0_5 * 100).toFixed(1), icon: Percent, color: "text-purple-500" },
  ];

  return (
    <section id="methodology" className="py-24 px-6 bg-transparent flex justify-center mt-32">
      <div className="max-w-5xl w-full">
        <header className="mb-16 flex items-center gap-4">
          <Activity className="text-ember-600" />
          <h2 className="text-3xl font-mono uppercase tracking-[0.2em]">{t.sections.methodology} — Live Metrics</h2>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {cards.map((c, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass-panel-deep p-6 rounded-xl flex flex-col items-center text-center border-white/5"
            >
              <c.icon className={`w-4 h-4 mb-4 ${c.color} opacity-80`} />
              <div className="text-4xl font-display italic text-ui-text mb-1">{c.val}</div>
              <div className="text-[10px] uppercase font-mono tracking-widest text-[#f5f1ea]/40">{c.label}</div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-8 text-center text-white/20 font-mono text-[10px] uppercase tracking-[0.5em]">
          U-Net Architecture — Small (32→256 filters) — 1.9M Parameters — Threshold τ* = 0.5
        </div>
      </div>
    </section>
  );
}
