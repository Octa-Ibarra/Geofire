import { useLanguage } from "../hooks/useLanguage";

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="h-20 border-t border-[#f5f1ea]/10 flex items-center justify-center px-10 relative z-10 text-[10px] opacity-40 italic font-mono uppercase tracking-widest text-[#f5f1ea]">
      <p>© {new Date().getFullYear()} GeoFire — AI Forest Fire Prediction Tool. Proyecto académico.</p>
    </footer>
  );
}
