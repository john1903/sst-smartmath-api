import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { BookOpen, LayoutDashboard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarUser } from "../components/dashboard/SidebarUser";

interface NavItem {
  to: string;
  labelKey: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  { to: "/dashboard", labelKey: "sidebar.dashboard", icon: <LayoutDashboard size={22} /> },
  { to: "/exercises", labelKey: "sidebar.exercises", icon: <BookOpen size={22} /> },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <button
          type="button"
          className="admin-sidebar__brand"
          onClick={() => navigate("/dashboard")}
          aria-label="Dashboard home"
        >
          <img src="/smartmath-logo.png" alt="SmartMath" />
        </button>

        <nav className="admin-sidebar__nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `admin-sidebar__link${isActive ? " admin-sidebar__link--active" : ""}`
              }
              end
            >
              <span className="admin-sidebar__icon">{item.icon}</span>
              <span className="admin-sidebar__label">{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <SidebarUser />
        </div>
      </aside>

      <main className="admin-main">{children}</main>
    </div>
  );
}
