export function Button({ children, variant = "primary", className = "", ...props }) {
  const base = "px-4 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gold hover:bg-gold-600 text-forest-900",
    dark: "bg-forest-900 hover:bg-forest-700 text-foam",
    outline: "border-2 border-forest-900 hover:bg-forest-900 hover:text-foam text-forest-900",
    danger: "bg-punch hover:bg-punch/80 text-foam",
    ghost: "hover:bg-forest-100 text-forest-900",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`bg-white border border-wood/20 rounded-lg shadow-sm ${className}`}>{children}</div>
  );
}

export function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-forest-100 text-forest-900",
    gold: "bg-gold/30 text-forest-900",
    leaf: "bg-leaf/15 text-leaf",
    punch: "bg-punch/15 text-punch",
  };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Input(props) {
  return (
    <input
      {...props}
      className={`w-full border border-wood/30 rounded-md px-3 py-2 text-sm bg-white focus:border-gold focus:ring-1 focus:ring-gold outline-none ${props.className || ""}`}
    />
  );
}

export function Textarea(props) {
  return (
    <textarea
      {...props}
      className={`w-full border border-wood/30 rounded-md px-3 py-2 text-sm bg-white focus:border-gold focus:ring-1 focus:ring-gold outline-none ${props.className || ""}`}
    />
  );
}

export function Select(props) {
  return (
    <select
      {...props}
      className={`w-full border border-wood/30 rounded-md px-3 py-2 text-sm bg-white focus:border-gold focus:ring-1 focus:ring-gold outline-none ${props.className || ""}`}
    />
  );
}

export function Label({ children, required = false }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-wood mb-1">
      {children}
      {required && <span className="text-punch ml-0.5" aria-hidden="true">*</span>}
    </label>
  );
}
