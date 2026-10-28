import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { hasRole, useAuth } from "../lib/auth";
import { BrandMark } from "./ui";

const ROLE_SHORT = { user: "závodník", organizer: "pořadatel", admin: "admin" };

function NavItem({ to, children, onClick, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `px-1 py-1 transition-colors hover:text-gold ${isActive ? "text-gold" : "text-foam/85"}`
      }
    >
      {children}
    </NavLink>
  );
}

function Avatar({ user }) {
  const initials = `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "?";
  return (
    <span className="w-8 h-8 rounded-full bg-gold text-forest-900 text-xs font-bold flex items-center justify-center shrink-0">
      {initials}
    </span>
  );
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(0);
  const location = useLocation();
  const close = () => setOpen(false);
  const isAdmin = hasRole(user, "admin");

  // počet čekajících žádostí o pořádání (jen admin), obnoví se při změně stránky
  useEffect(() => {
    if (!isAdmin) return;
    api.pendingRequestsCount().then((r) => setPending(r.count)).catch(() => {});
  }, [isAdmin, location.pathname]);

  function handleLogout() {
    logout();
    close();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-clip">
      <header className="bg-forest-900 text-foam relative z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0" onClick={close}>
            <BrandMark className="w-8 h-8 group-hover:-rotate-6 transition-transform" />
            <span className="font-display text-2xl font-extrabold tracking-tight">PIVoŠ</span>
          </Link>

          <button
            className="lg:hidden p-2 -mr-2"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Menu"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>

          <div
            className={`${open ? "flex" : "hidden"} lg:flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 lg:gap-6 flex-1
              absolute lg:static top-16 left-0 right-0 bg-forest-900 lg:bg-transparent px-4 sm:px-6 lg:px-0 pb-6 pt-2 lg:p-0 border-t border-white/10 lg:border-0 shadow-lift lg:shadow-none`}
          >
            <nav className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5 text-sm font-medium">
              <NavItem to="/" end onClick={close}>Kalendář závodů</NavItem>
              <NavItem to="/vysledky" onClick={close}>Výsledky</NavItem>
              <NavItem to="/ranking" onClick={close}>Ranking</NavItem>
              {user && <NavItem to="/moje-prihlasky" onClick={close}>Moje přihlášky</NavItem>}
              {hasRole(user, "organizer") ? (
                <NavItem to="/admin" end onClick={close}>Pro pořadatele</NavItem>
              ) : (
                <NavItem to={user ? "/ucet#poradani" : "/registrace"} onClick={close}>Pro pořadatele</NavItem>
              )}
              {isAdmin && (
                <NavItem to="/admin/uzivatele" onClick={close}>
                  Uživatelé
                  {pending > 0 && (
                    <span
                      className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-punch text-white text-xs font-bold"
                      title="Čekající žádosti o pořádání"
                    >
                      {pending}
                    </span>
                  )}
                </NavItem>
              )}
            </nav>

            <div className="flex items-center gap-3 text-sm">
              {user ? (
                <>
                  <Link to="/ucet" onClick={close} className="flex items-center gap-2 hover:text-gold transition-colors">
                    <Avatar user={user} />
                    <span className="font-medium">
                      {user.first_name} {user.last_name?.[0] ? `${user.last_name[0]}.` : ""}
                      <span className="text-foam/50 font-normal"> · {ROLE_SHORT[user.role] || "závodník"}</span>
                    </span>
                  </Link>
                  <button onClick={handleLogout} className="text-foam/50 hover:text-gold transition-colors ml-2">
                    Odhlásit
                  </button>
                </>
              ) : (
                <>
                  <NavItem to="/prihlaseni" onClick={close}>Přihlásit se</NavItem>
                  <Link
                    to="/registrace"
                    onClick={close}
                    className="bg-gold text-forest-900 font-semibold px-4 py-2 rounded-xl hover:bg-gold-600 transition-colors"
                  >
                    Registrace
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">{children}</main>

      <footer className="border-t border-line py-8 text-sm text-forest-700/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BrandMark className="w-5 h-5" />
            <span className="font-display font-bold text-forest-900">PIVoŠ</span>
            <span>· Pivní informační a výsledkový systém</span>
          </div>
          <div>
            © Pepko 2026
            <span className="mx-2">·</span>
            <Link to="/ochrana-udaju" className="underline hover:text-forest-900">Ochrana osobních údajů</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
