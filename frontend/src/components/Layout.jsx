import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { hasRole, useAuth } from "../lib/auth";

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      onClick={onClick}
      className={({ isActive }) => `transition-colors hover:text-gold ${isActive ? "text-gold" : ""}`}
    >
      {children}
    </NavLink>
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
    <div className="min-h-screen flex flex-col">
      <header className="bg-forest-900 text-foam relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-5 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group" onClick={close}>
            <img src="/logo-gold.svg" alt="" className="w-11 h-11 md:w-12 md:h-12 group-hover:rotate-6 transition-transform" />
            <span className="font-display text-2xl md:text-3xl font-extrabold tracking-tight uppercase">Pivní štafety</span>
          </Link>
          <button
            className="md:hidden px-2 py-1 border border-foam/30 rounded text-sm"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Menu"
          >
            ☰
          </button>
          <nav
            className={`${open ? "flex" : "hidden"} md:flex absolute md:static top-16 left-0 right-0 z-20 bg-forest-900 md:bg-transparent flex-col md:flex-row items-start md:items-center gap-4 px-5 py-4 md:p-0 text-sm font-medium`}
          >
            <NavItem to="/" onClick={close}>Kalendář</NavItem>
            {user && <NavItem to="/moje-prihlasky" onClick={close}>Moje přihlášky</NavItem>}
            {hasRole(user, "organizer") && <NavItem to="/admin" onClick={close}>Správa závodů</NavItem>}
            {isAdmin && (
              <NavItem to="/admin/uzivatele" onClick={close}>
                Uživatelé
                {pending > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-punch text-foam text-xs font-bold" title="Čekající žádosti o pořádání">
                    {pending}
                  </span>
                )}
              </NavItem>
            )}
            {user ? (
              <>
                <NavItem to="/ucet" onClick={close}>👤 {user.first_name}</NavItem>
                <button onClick={handleLogout} className="text-forest-100/70 hover:text-punch transition-colors">
                  Odhlásit
                </button>
              </>
            ) : (
              <>
                <NavItem to="/prihlaseni" onClick={close}>Přihlásit se</NavItem>
                <Link to="/registrace" onClick={close} className="bg-gold text-forest-900 px-3 py-1.5 rounded-md hover:bg-gold-600">
                  Registrace
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-5 py-8">{children}</main>
      <footer className="border-t border-wood/30 py-6 text-center text-xs text-forest-700/60 font-mono">
        SAJ! | © Pepko 2026
        <span className="mx-2">·</span>
        <Link to="/ochrana-udaju" className="underline hover:text-wood">Ochrana osobních údajů</Link>
      </footer>
    </div>
  );
}
