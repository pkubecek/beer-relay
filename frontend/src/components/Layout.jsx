import { Link, useNavigate } from "react-router-dom";
import { isLoggedIn, clearToken } from "../lib/api";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const loggedIn = isLoggedIn();

  function logout() {
    clearToken();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-forest-900 text-foam">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="leg-marker !bg-gold !border-forest-900 !text-forest-900 group-hover:rotate-6 transition-transform">
              🍺
            </span>
            <span className="font-display text-2xl md:text-3xl font-extrabold tracking-tight uppercase">
              Pivní štafety
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/" className="hover:text-gold transition-colors">
              Závody
            </Link>
            {loggedIn ? (
              <>
                <Link to="/admin" className="hover:text-gold transition-colors">
                  Administrace
                </Link>
                <button onClick={logout} className="text-forest-100/70 hover:text-punch transition-colors">
                  Odhlásit
                </button>
              </>
            ) : (
              <Link to="/admin/login" className="hover:text-gold transition-colors">
                Přihlásit se
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-5 py-8">{children}</main>
      <footer className="border-t border-wood/30 py-6 text-center text-xs text-forest-700/60 font-mono">
        mapa • buzola • půllitr
      </footer>
    </div>
  );
}
