import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FilePlus2,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Button } from "@smartmath/ui";
import { useAuth } from "../auth/AuthProvider";
import { listCategories, type Category } from "../api/categories";
import {
  deleteExercise,
  listExercises,
  type DifficultyLevel,
  type ExerciseAdmin,
  type ExerciseType,
} from "../api/exercises";
import type { ApiError } from "../api/http";
import { AdminLayout } from "../layouts/AdminLayout";

const TYPES: ExerciseType[] = [
  "singleChoice",
  "multipleChoice",
  "trueFalse",
  "matching",
  "openEnded",
];

const DIFFICULTIES: DifficultyLevel[] = ["easy", "medium", "hard"];

function pickTitle(ex: ExerciseAdmin, lang: string): string {
  return (
    ex.translations.find((t) => t.languageCode === lang)?.title ??
    ex.translations[0]?.title ??
    "(untitled)"
  );
}

interface Filters {
  categoryId: string;
  exerciseType: ExerciseType | "";
  difficultyLevel: DifficultyLevel | "";
}

const EMPTY_FILTERS: Filters = {
  categoryId: "",
  exerciseType: "",
  difficultyLevel: "",
};

function countActive(f: Filters): number {
  return (
    (f.categoryId ? 1 : 0) +
    (f.exerciseType ? 1 : 0) +
    (f.difficultyLevel ? 1 : 0)
  );
}

interface FilterPopoverProps {
  filters: Filters;
  categories: Category[];
  onChange: (f: Filters) => void;
  onClear: () => void;
}

function FilterPopover({
  filters,
  categories,
  onChange,
  onClear,
}: FilterPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const active = countActive(filters);

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

  return (
    <div className="filter-popover" ref={rootRef}>
      <button
        type="button"
        className={`filter-popover__trigger${active ? " filter-popover__trigger--active" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal size={16} />
        <span>{t("exercises.filter")}</span>
        {active > 0 ? (
          <span className="filter-popover__badge">{active}</span>
        ) : null}
      </button>
      {open ? (
        <div className="filter-popover__panel" role="dialog">
          <div className="filter-popover__row">
            <label htmlFor="f-cat">{t("exercises.category")}</label>
            <select
              id="f-cat"
              className="filter-bar__select"
              value={filters.categoryId}
              onChange={(e) =>
                onChange({ ...filters, categoryId: e.target.value })
              }
            >
              <option value="">{t("exercises.allCategories")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-popover__row">
            <label htmlFor="f-type">{t("exercises.type")}</label>
            <select
              id="f-type"
              className="filter-bar__select"
              value={filters.exerciseType}
              onChange={(e) =>
                onChange({
                  ...filters,
                  exerciseType: e.target.value as ExerciseType | "",
                })
              }
            >
              <option value="">{t("exercises.allTypes")}</option>
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`typeLabels.${ty}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-popover__row">
            <label htmlFor="f-diff">{t("exercises.difficulty")}</label>
            <select
              id="f-diff"
              className="filter-bar__select"
              value={filters.difficultyLevel}
              onChange={(e) =>
                onChange({
                  ...filters,
                  difficultyLevel: e.target.value as DifficultyLevel | "",
                })
              }
            >
              <option value="">{t("exercises.allDifficulties")}</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {t(`difficultyLabels.${d}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-popover__footer">
            <button
              type="button"
              className="filter-popover__clear"
              onClick={onClear}
              disabled={active === 0}
            >
              <X size={14} />
              {t("exercises.clear")}
            </button>
            <button
              type="button"
              className="filter-popover__done"
              onClick={() => setOpen(false)}
            >
              {t("exercises.done")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Exercises() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [pendingDelete, setPendingDelete] = useState<ExerciseAdmin | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ExerciseAdmin[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    const to = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(to);
  }, [query]);

  useEffect(() => {
    if (!accessToken) return;
    listCategories(accessToken)
      .then((p) => setCategories(p.items))
      .catch(() => {
        /* filter still usable without it */
      });
  }, [accessToken, lang]);

  const fetchFirstPage = useCallback(async () => {
    if (!accessToken) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const page = await listExercises(accessToken, {
        query: debouncedQuery || undefined,
        categoryId: filters.categoryId || undefined,
        exerciseType: filters.exerciseType || undefined,
        difficultyLevel: filters.difficultyLevel || undefined,
        limit: 20,
      });
      if (seq !== requestSeq.current) return;
      setItems(page.items);
      setNextCursor(page.nextCursor);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      const err = e as ApiError;
      setError(err.detail ?? err.title ?? t("exercises.loadFailed"));
      setItems([]);
      setNextCursor(undefined);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [accessToken, debouncedQuery, filters, lang, t]);

  useEffect(() => {
    void fetchFirstPage();
  }, [fetchFirstPage]);

  const loadMore = useCallback(async () => {
    if (!accessToken || !nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await listExercises(accessToken, {
        query: debouncedQuery || undefined,
        categoryId: filters.categoryId || undefined,
        exerciseType: filters.exerciseType || undefined,
        difficultyLevel: filters.difficultyLevel || undefined,
        cursor: nextCursor,
        limit: 20,
      });
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (e) {
      const err = e as ApiError;
      setError(err.detail ?? err.title ?? t("exercises.loadFailed"));
    } finally {
      setLoadingMore(false);
    }
  }, [accessToken, nextCursor, debouncedQuery, filters, t]);

  const showEmpty = !loading && !error && items.length === 0;

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string) => map.get(id) ?? id;
  }, [categories]);

  return (
    <AdminLayout>
      <header className="dashboard-hero">
        <div>
          <h1 className="dashboard-hero__title">{t("exercises.title")}</h1>
          <p className="dashboard-hero__lede">{t("exercises.lede")}</p>
        </div>
        <div className="dashboard-hero__actions">
          <Button
            as="a"
            href="/dashboard"
            variant="outline"
            className="hero-btn"
            leadingIcon={<ArrowLeft size={16} />}
          >
            {t("exercises.backToDashboard")}
          </Button>
          <Button
            as="a"
            href="/exercises/new"
            className="hero-btn"
            leadingIcon={<FilePlus2 size={16} />}
          >
            {t("common.create")}
          </Button>
        </div>
      </header>

      <section className="card">
        <div className="filter-bar">
          <div className="filter-bar__search">
            <Search size={16} className="filter-bar__search-icon" />
            <input
              className="filter-bar__input"
              type="search"
              placeholder={t("exercises.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("exercises.searchPlaceholder")}
            />
          </div>
          <FilterPopover
            filters={filters}
            categories={categories}
            onChange={setFilters}
            onClear={() => setFilters(EMPTY_FILTERS)}
          />
        </div>
      </section>

      <section className="card exercise-list-card">
        {loading ? (
          <ul className="exercise-list">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="exercise-list__row exercise-list__row--skel">
                <span className="skeleton skeleton--line" style={{ width: 70 }} />
                <span className="skeleton skeleton--line" style={{ width: 120 }} />
                <span className="skeleton skeleton--line" style={{ flex: 1 }} />
                <span className="skeleton skeleton--line" style={{ width: 100 }} />
                <span className="skeleton skeleton--line" style={{ width: 40 }} />
              </li>
            ))}
          </ul>
        ) : error ? (
          <div className="exercise-list__empty">
            <strong>{t("exercises.loadFailed")}</strong>
            <div>{error}</div>
            <Button variant="outline" onClick={() => void fetchFirstPage()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : showEmpty ? (
          <div className="exercise-list__empty">
            <strong>{t("exercises.empty")}</strong>
            <div>{t("exercises.emptyHint")}</div>
          </div>
        ) : (
          <>
            <div className="exercise-list__head">
              <span>{t("exercises.col.difficulty")}</span>
              <span>{t("exercises.col.type")}</span>
              <span>{t("exercises.col.title")}</span>
              <span>{t("exercises.col.category")}</span>
              <span className="exercise-list__points-h">
                {t("exercises.col.points")}
              </span>
              <span className="exercise-list__actions-h">
                {t("exercises.col.actions")}
              </span>
            </div>
            <ul className="exercise-list">
              {items.map((ex) => (
                <li key={ex.id} className="exercise-list__row">
                  <span
                    className={`pill pill--${ex.difficultyLevel}`}
                    title={t("exercises.col.difficulty")}
                  >
                    {t(`difficultyLabels.${ex.difficultyLevel}`)}
                  </span>
                  <span
                    className="exercise-list__type"
                    title={t("exercises.col.type")}
                  >
                    {t(`typeLabels.${ex.exerciseType}`)}
                  </span>
                  <span
                    className="exercise-list__title"
                    title={pickTitle(ex, i18n.language)}
                  >
                    {pickTitle(ex, i18n.language)}
                  </span>
                  <span className="exercise-list__category">
                    {categoryName(ex.categoryId)}
                  </span>
                  <span className="exercise-list__points">
                    {ex.maxPoints} pt
                  </span>
                  <span className="exercise-list__actions">
                    <button
                      type="button"
                      className="row-action"
                      aria-label={t("common.edit")}
                      onClick={() => navigate(`/exercises/${ex.id}/edit`)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="row-action row-action--danger"
                      aria-label={t("common.delete")}
                      onClick={() => setPendingDelete(ex)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="exercise-list__footer">
              <span className="exercise-list__count">
                {t("exercises.showing", { count: items.length })}
              </span>
              {nextCursor ? (
                <Button
                  variant="outline"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? t("common.loading") : t("exercises.loadMore")}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </section>

      {pendingDelete ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal">
            <h3 className="modal__title">{t("exercises.delete.title")}</h3>
            <p
              className="modal__body"
              dangerouslySetInnerHTML={{
                __html: t("exercises.delete.body", {
                  title: pickTitle(pendingDelete, i18n.language),
                }),
              }}
            />
            <div className="modal__actions">
              <Button
                variant="ghost"
                className="hero-btn"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                className="hero-btn modal__delete"
                onClick={async () => {
                  if (!accessToken || !pendingDelete) return;
                  setDeleting(true);
                  try {
                    await deleteExercise(accessToken, pendingDelete.id);
                    setItems((prev) =>
                      prev.filter((x) => x.id !== pendingDelete.id),
                    );
                    setPendingDelete(null);
                    toast.success(t("exercises.delete.success"));
                  } catch (e) {
                    const err = e as ApiError;
                    const message =
                      err.detail ?? err.title ?? t("exercises.delete.fail");
                    setError(message);
                    toast.error(message);
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
              >
                {deleting
                  ? t("exercises.delete.deleting")
                  : t("common.delete")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
}
