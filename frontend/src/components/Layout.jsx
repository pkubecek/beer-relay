import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
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
  const close = () => setOpen(false);

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
            <span className="leg-marker !bg-gold !border-forest-900 !text-forest-900 group-hover:rotate-6 transition-transform">
              🍺
            </span>
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
            {hasRole(user, "admin") && <NavItem to="/admin/uzivatele" onClick={close}>Uživatelé</NavItem>}
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
        mapa • buzola • půllitr
      </footer>
    </div>
  );
}
