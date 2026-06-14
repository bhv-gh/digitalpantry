import { Link, NavLink, useLocation } from "react-router-dom";
import { HomeIcon, ScanIcon, PantryIcon, CartIcon, ChefIcon, GearIcon } from "./icons";

const tabs = [
  { to: "/",         label: "Home",    Icon: HomeIcon },
  { to: "/scan",     label: "Scan",    Icon: ScanIcon },
  { to: "/pantry",   label: "Pantry",  Icon: PantryIcon },
  { to: "/shopping", label: "Shop",    Icon: CartIcon },
  { to: "/recipes",  label: "Recipes", Icon: ChefIcon },
];

export default function AppLayout({ children }) {
  const { pathname } = useLocation();
  const title = titleFor(pathname);

  return (
    <div className="flex flex-col h-full">
      <header className="safe-top sticky top-0 z-20 bg-brand-600 text-white shadow">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="text-lg font-semibold tracking-tight">{title}</Link>
          <Link to="/settings" className="p-2 -mr-2 rounded hover:bg-brand-700" aria-label="Settings">
            <GearIcon className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      <nav className="safe-bottom fixed bottom-0 inset-x-0 z-20 bg-white border-t border-gray-200">
        <ul className="grid grid-cols-5">
          {tabs.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 py-2 text-xs ${
                    isActive ? "text-brand-600" : "text-gray-500"
                  }`
                }
              >
                <Icon className="w-6 h-6" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function titleFor(path) {
  if (path === "/") return "Pantry Digitiser";
  if (path.startsWith("/scan")) return "Scan";
  if (path.startsWith("/pantry/add")) return "Add to Pantry";
  if (path.startsWith("/pantry")) return "My Pantry";
  if (path.startsWith("/shopping")) return "Shopping List";
  if (path.startsWith("/recipes")) return "Recipes";
  if (path.startsWith("/settings")) return "Settings";
  return "Pantry";
}
