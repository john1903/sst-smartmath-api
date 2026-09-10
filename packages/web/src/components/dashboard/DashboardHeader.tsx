import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthProvider";

function greetingName(email?: string, name?: string, sub?: string) {
  if (name) return name.split(" ")[0];
  if (email) {
    const local = email.slice(0, email.indexOf("@"));
    const first = local.split(/[.\-_]/)[0] ?? local;
    return first.charAt(0).toUpperCase() + first.slice(1);
  }
  return sub?.slice(0, 6) ?? "there";
}

export function DashboardHeader() {
  const { user } = useAuth();
  const { t } = useTranslation();
  return (
    <header className="dashboard-hero">
      <div>
        <h1 className="dashboard-hero__title">
          {t("dashboard.hey", {
            name: greetingName(user?.email, user?.name, user?.sub),
          })}
        </h1>
        <p className="dashboard-hero__lede">{t("dashboard.welcome")}</p>
      </div>
    </header>
  );
}
