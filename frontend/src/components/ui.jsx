import { Link } from "react-router-dom";

export function Button({ children, variant = "primary", size = "md", className = "", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const variants = {
    primary: "bg-gold hover:bg-gold-600 text-forest-900 shadow-sm",
    dark: "bg-forest-900 hover:bg-forest-700 text-foam",
    outline: "border border-line bg-white hover:border-forest-900 text-forest-900",
    danger: "bg-punch hover:bg-punch/85 text-white",
    ghost: "hover:bg-forest-100 text-forest-900",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = "", ...props }) {
  // vlastní pozadí/okraj z className má přednost před výchozím bílým
  const bg = /(^|\s)bg-/.test(className) ? "" : "bg-white";
  const border = /(^|\s)border-(?!t|b|l|r|x|y|0|2|4|\[)/.test(className) ? "border" : "border border-line";
  return (
    <div className={`${bg} ${border} rounded-2xl shadow-card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className = "" }) {
  const tones = {
    neutral: "bg-forest-100 text-forest-700",
    gold: "bg-gold-50 text-[#8A5A00]",
    leaf: "bg-[#DFF2E6] text-leaf",
    punch: "bg-[#FBE4DF] text-punch",
    violet: "bg-[#ECE8FB] text-violet",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

const fieldCls =
  "w-full border border-line rounded-xl px-3 py-2 text-sm bg-white focus:border-gold focus:ring-2 focus:ring-gold/30 outline-none";

export function Input(props) {
  return <input {...props} className={`${fieldCls} ${props.className || ""}`} />;
}

export function Textarea(props) {
  return <textarea {...props} className={`${fieldCls} ${props.className || ""}`} />;
}

export function Select(props) {
  return <select {...props} className={`${fieldCls} ${props.className || ""}`} />;
}

export function Label({ children, required = false }) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-forest-700/60 mb-1">
      {children}
      {required && <span className="text-punch ml-0.5" aria-hidden="true">*</span>}
    </label>
  );
}

/** Malý nadpis nad hodnotou („START“, „KAPACITA“…). */
export function Eyebrow({ children, className = "" }) {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${className}`}>{children}</p>
  );
}

/** Logo – půllitr s pěnou. */
export function BrandMark({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M23 12h2.5a3.5 3.5 0 0 1 3.5 3.5v3a3.5 3.5 0 0 1-3.5 3.5H23v-3h2.2a.8.8 0 0 0 .8-.8v-2.4a.8.8 0 0 0-.8-.8H23z" fill="#EFB23C" />
      <rect x="5" y="9" width="19" height="20" rx="3.5" fill="#EFB23C" />
      <path d="M5.5 11c-1.8-.6-2.6-2.3-2-3.9.6-1.5 2.2-2.2 3.7-1.8C8 3.6 9.8 2.6 11.8 3c1.3.2 2.3 1 2.9 2 1-.8 2.4-1.1 3.7-.7 1.6.5 2.6 1.9 2.6 3.4 1.5.2 2.8 1.4 2.9 3H5.5z" fill="#FFF8E7" />
    </svg>
  );
}

/**
 * Tmavý pruh pod hlavičkou (navazuje na ni) s drobečkovou navigací, nadpisem a podtitulkem.
 * `overlap` = obsah pod ním (karty, přepínač) se o kus „zasune“ do pruhu jako v mockupech.
 */
export function PageHero({ crumbs, eyebrow, badges, title, subtitle, actions, aside, children, overlap = false, size = "lg" }) {
  return (
    <section className={`full-bleed bg-forest-900 text-foam -mt-8 ${overlap ? "pb-16 mb-[-2.75rem]" : "pb-10 mb-8"}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 md:pt-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="min-w-0 max-w-3xl">
            {crumbs && (
              <nav className="text-sm text-foam/60 mb-3" aria-label="Drobečková navigace">
                {crumbs.map((c, i) => (
                  <span key={i}>
                    {i > 0 && <span className="mx-1.5">/</span>}
                    {c.to ? (
                      <Link to={c.to} className="text-gold underline underline-offset-2 hover:text-gold-600">{c.label}</Link>
                    ) : (
                      <span>{c.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            {badges && <div className="flex flex-wrap items-center gap-2 mb-3">{badges}</div>}
            {eyebrow && <Eyebrow className="text-gold mb-2">{eyebrow}</Eyebrow>}
            <h1
              className={`font-display font-extrabold tracking-tight leading-[1.05] ${
                size === "lg" ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"
              }`}
            >
              {title}
            </h1>
            {subtitle && <div className="mt-3 text-base md:text-lg text-foam/70">{subtitle}</div>}
            {actions && <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
          {aside && <div className="lg:shrink-0">{aside}</div>}
        </div>
        {children}
      </div>
    </section>
  );
}

/** Přepínač ve tvaru „pilulky“ (Nadcházející / Proběhlé, Mix · 15 / Muži · 18 …). */
export function Segmented({ options, value, onChange, className = "" }) {
  return (
    <div className={`inline-flex max-w-full overflow-x-auto bg-white border border-line rounded-2xl p-1 shadow-card ${className}`} role="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              active ? "bg-forest-900 text-foam" : "text-forest-700/70 hover:text-forest-900"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Ukazatel zaplněnosti (kapacita závodu). */
export function Progress({ value, max, className = "" }) {
  if (!max) return null;
  const pct = Math.min(100, Math.round((value / max) * 100));
  const full = value >= max;
  return (
    <div className={`h-1.5 rounded-full bg-forest-100 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${full ? "bg-punch" : "bg-gold"}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Dlaždice s klíčovým údajem (Start, Uzávěrka, Startovné, Kapacita). */
export function StatTile({ label, value, note, children }) {
  return (
    <Card className="p-4">
      <Eyebrow className="text-forest-700/60">{label}</Eyebrow>
      <p className="font-display text-2xl font-extrabold leading-tight mt-1 tabular">{value}</p>
      {note && <p className="text-sm text-forest-700/60 mt-0.5">{note}</p>}
      {children}
    </Card>
  );
}

/** Nadpis sekce uvnitř stránky. */
export function SectionTitle({ children, className = "" }) {
  return <h2 className={`font-display text-xl font-bold tracking-tight mb-3 ${className}`}>{children}</h2>;
}
