import { useEffect, useRef, useState } from "react";
import { ChevronUp, Globe, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../auth/AuthProvider";

type Lang = "en-GB" | "pl-PL";
const LANGS: { code: Lang; label: string }[] = [
  { code: "pl-PL", label: "Polski" },
  { code: "en-GB", label: "English" },
];

function initials(name: string | undefined, email: string | undefined, sub: string) {
  const src = name ?? email ?? sub;
  const base = src.includes("@") ? src.slice(0, src.indexOf("@")) : src;
  const parts = base.split(/[.\-_ ]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "") || src[0] || "?").toUpperCase();
}

export function SidebarUser() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = (i18n.language as Lang) ?? "pl-PL";
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pickLang(next: Lang) {
    void i18n.changeLanguage(next);
  }

  if (!user) return null;

  return (
    <div className="sidebar-user" ref={rootRef}>
      {open ? (
        <div className="sidebar-user__panel" role="menu">
          <div className="sidebar-user__identity">
            <div className="sidebar-user__name">{user.name ?? t("sidebar.admin")}</div>
            <div className="sidebar-user__email">{user.email ?? user.sub}</div>
          </div>

          <button
            type="button"
            className="sidebar-user__item"
            role="menuitem"
            onClick={() => {
              const next = LANGS[(LANGS.findIndex((l) => l.code === lang) + 1) % LANGS.length];
              pickLang(next.code);
            }}
          >
            <Globe size={16} />
            <span>{t("common.language")}</span>
            <span className="sidebar-user__item-value">
              {LANGS.find((l) => l.code === lang)?.label}
            </span>
          </button>

          <button
            type="button"
            className="sidebar-user__item sidebar-user__item--danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void logout();
            }}
          >
            <LogOut size={16} />
            <span>{t("common.logout")}</span>
          </button>
        </div>
      ) : null}
      <button
        type="button"
        className="sidebar-user__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sidebar-user__avatar" aria-hidden="true">
          {initials(user.name, user.email, user.sub)}
        </span>
        <span className="sidebar-user__label">
          <span className="sidebar-user__label-name">{user.name ?? t("sidebar.admin")}</span>
          <span className="sidebar-user__label-email">
            {user.email ?? user.sub}
          </span>
        </span>
        <ChevronUp
          size={16}
          className={`sidebar-user__chev${open ? " sidebar-user__chev--open" : ""}`}
        />
      </button>
    </div>
  );
}
