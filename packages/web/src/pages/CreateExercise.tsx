import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { ArrowLeft, ChevronDown, Plus, Upload, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Button } from "@smartmath/ui";
import { useAuth } from "../auth/AuthProvider";
import { listCategories, type Category } from "../api/categories";
import { listRequirements, type Requirement } from "../api/requirements";
import {
  addIllustrations,
  createExercise,
  deleteIllustration,
  getExercise,
  updateExercise,
  type CreateExerciseBody,
  type CreateExerciseTranslation,
  type DifficultyLevel,
  type ExerciseAdmin,
  type ExerciseType,
  type UpdateExerciseBody,
} from "../api/exercises";
import type { ApiError } from "../api/http";
import { LatexInput } from "../components/latex/LatexInput";
import { AdminLayout } from "../layouts/AdminLayout";

const TYPES: ExerciseType[] = [
  "singleChoice",
  "multipleChoice",
  "trueFalse",
  "matching",
  "openEnded",
];
const DIFFICULTIES: DifficultyLevel[] = ["easy", "medium", "hard"];

const LANGS = [
  { code: "pl-PL", label: "Polski" },
  { code: "en-GB", label: "English" },
] as const;
type Lang = (typeof LANGS)[number]["code"];

function emptyTranslation(lang: Lang): CreateExerciseTranslation {
  return {
    languageCode: lang,
    title: "",
    description: "",
  };
}

function isTranslationFilled(t: CreateExerciseTranslation): boolean {
  return Boolean((t.title as string)?.trim() && (t.description as string)?.trim());
}

function translationsFromExercise(
  ex: ExerciseAdmin,
): Record<Lang, CreateExerciseTranslation> {
  const byLang: Record<Lang, CreateExerciseTranslation> = {
    "pl-PL": emptyTranslation("pl-PL"),
    "en-GB": emptyTranslation("en-GB"),
  };
  for (const tr of ex.translations) {
    if (tr.languageCode === "pl-PL" || tr.languageCode === "en-GB") {
      byLang[tr.languageCode] = tr as CreateExerciseTranslation;
    }
  }
  return byLang;
}

interface RequirementsPickerProps {
  loading: boolean;
  requirements: Requirement[];
  selected: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}

function RequirementsPicker({
  loading,
  requirements,
  selected,
  onChange,
  disabled,
}: RequirementsPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
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

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : [...selected, id],
    );
  }

  return (
    <div className="req-picker" ref={rootRef}>
      <button
        type="button"
        className="req-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="req-picker__label">
          {selected.length === 0
            ? disabled
              ? t("createExercise.pickCategoryFirst")
              : t("createExercise.selectRequirements")
            : `${selected.length} selected`}
        </span>
        <ChevronDown size={16} />
      </button>
      {open ? (
        <div className="req-picker__panel" role="listbox">
          {loading ? (
            <div className="req-picker__empty">{t("common.loading")}</div>
          ) : requirements.length === 0 ? (
            <div className="req-picker__empty">
              {t("createExercise.noRequirements")}
            </div>
          ) : (
            <ul className="req-picker__list">
              {requirements.map((r) => {
                const isSelected = selected.includes(r.id);
                return (
                  <li key={r.id}>
                    <label className="req-picker__row">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(r.id)}
                      />
                      <span className="req-picker__def">{r.definition}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface StepsListProps {
  value: string[];
  onChange: (v: string[]) => void;
}

function StepsList({ value, onChange }: StepsListProps) {
  const { t } = useTranslation();
  const list = value.length > 0 ? value : [""];
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  function focusRow(i: number) {
    setTimeout(() => inputsRef.current[i]?.focus(), 0);
  }

  function setAt(i: number, text: string) {
    const next = [...list];
    next[i] = text;
    onChange(next);
  }

  function insertAfter(i: number) {
    const next = [...list];
    next.splice(i + 1, 0, "");
    onChange(next);
    focusRow(i + 1);
  }

  function removeAt(i: number) {
    if (list.length === 1) {
      onChange([""]);
      return;
    }
    const next = list.filter((_, idx) => idx !== i);
    onChange(next);
    focusRow(Math.max(0, i - 1));
  }

  return (
    <ol className="steps-list">
      {list.map((step, i) => (
        <li key={i} className="steps-list__row">
          <span className="steps-list__index">{i + 1}.</span>
          <div className="steps-list__field">
            <LatexInput
              inputRef={(el) => {
                inputsRef.current[i] = el as HTMLInputElement | null;
              }}
              className="steps-list__input"
              value={step}
              placeholder={t("createExercise.stepPlaceholder")}
              onChange={(v) => setAt(i, v)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  insertAfter(i);
                } else if (
                  e.key === "Backspace" &&
                  step === "" &&
                  list.length > 1
                ) {
                  e.preventDefault();
                  removeAt(i);
                } else if (e.key === "ArrowDown" && i < list.length - 1) {
                  e.preventDefault();
                  focusRow(i + 1);
                } else if (e.key === "ArrowUp" && i > 0) {
                  e.preventDefault();
                  focusRow(i - 1);
                }
              }}
            />
          </div>
          <button
            type="button"
            className="steps-list__remove"
            onClick={() => removeAt(i)}
            disabled={list.length === 1 && step === ""}
            aria-label="Remove step"
          >
            <X size={14} />
          </button>
        </li>
      ))}
      <button
        type="button"
        className="steps-list__add"
        onClick={() => insertAfter(list.length - 1)}
      >
        <Plus size={14} />
        {t("createExercise.addStep")}
      </button>
    </ol>
  );
}

interface TranslationFieldsProps {
  type: ExerciseType;
  value: CreateExerciseTranslation;
  onChange: (t: CreateExerciseTranslation) => void;
}

function TranslationFields({ type, value, onChange }: TranslationFieldsProps) {
  const { t } = useTranslation();
  function set<K extends keyof CreateExerciseTranslation>(
    key: K,
    v: CreateExerciseTranslation[K],
  ) {
    onChange({ ...value, [key]: v });
  }

  const optionKeys = ["A", "B", "C", "D"] as const;

  return (
    <div className="create-form__grid">
      <label className="field">
        <span className="field__label">{t("createExercise.fields.title")}</span>
        <input
          className="field__input"
          type="text"
          maxLength={255}
          value={(value.title as string) ?? ""}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </label>
      <div className="field field--wide">
        <span className="field__label">{t("createExercise.fields.description")}</span>
        <LatexInput
          multiline
          rows={3}
          maxLength={2048}
          value={(value.description as string) ?? ""}
          onChange={(v) => set("description", v)}
          required
        />
      </div>

      {type === "singleChoice" || type === "multipleChoice" ? (
        <>
          <fieldset className="field field--wide">
            <legend className="field__label">{t("createExercise.fields.options")}</legend>
            <div className="options-grid">
              {optionKeys.map((k) => {
                const v = ((value.options as Record<string, string>) ?? {})[k] ?? "";
                return (
                  <div key={k} className="options-row">
                    <span className="options-row__key">{k}</span>
                    <div className="options-row__field">
                      <LatexInput
                        value={v}
                        onChange={(next) => {
                          const cur =
                            (value.options as Record<string, string>) ?? {};
                          const merged = { ...cur, [k]: next };
                          if (!next) delete merged[k];
                          set("options", merged);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
          {type === "singleChoice" ? (
            <label className="field">
              <span className="field__label">{t("createExercise.fields.solutionKey")}</span>
              <select
                className="field__input"
                value={(value.solution as string) ?? ""}
                onChange={(e) => set("solution", e.target.value)}
                required
              >
                <option value="">—</option>
                {optionKeys
                  .filter(
                    (k) =>
                      ((value.options as Record<string, string>) ?? {})[k] !==
                      undefined,
                  )
                  .map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
              </select>
            </label>
          ) : (
            <div className="field field--wide">
              <span className="field__label">{t("createExercise.fields.solutionKeys")}</span>
              <div className="options-checks">
                {optionKeys.map((k) => {
                  const solution = (value.solution as string[]) ?? [];
                  const enabled = Object.prototype.hasOwnProperty.call(
                    (value.options as Record<string, string>) ?? {},
                    k,
                  );
                  const checked = solution.includes(k);
                  return (
                    <label key={k} className={`chip${checked ? " chip--on" : ""}`}>
                      <input
                        type="checkbox"
                        disabled={!enabled}
                        checked={checked}
                        onChange={() => {
                          set(
                            "solution",
                            checked
                              ? solution.filter((x) => x !== k)
                              : [...solution, k],
                          );
                        }}
                      />
                      {k}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : null}

      {type === "trueFalse" ? (
        <fieldset className="field field--wide">
          <legend className="field__label">{t("createExercise.fields.statements")}</legend>
          <div className="options-grid">
            {optionKeys.map((k) => {
              const stmt =
                ((value.statements as Record<string, string>) ?? {})[k] ?? "";
              const solution =
                (value.solution as Record<string, boolean>) ?? {};
              return (
                <div key={k} className="tf-row">
                  <span className="options-row__key">{k}</span>
                  <div className="options-row__field">
                    <LatexInput
                      value={stmt}
                      placeholder={t("createExercise.fields.statementPlaceholder", { key: k })}
                      onChange={(next) => {
                        const cur =
                          (value.statements as Record<string, string>) ?? {};
                        const nextS = { ...cur, [k]: next };
                        const nextSol = { ...solution };
                        if (!next) {
                          delete nextS[k];
                          delete nextSol[k];
                        }
                        onChange({
                          ...value,
                          statements: nextS,
                          solution: nextSol,
                        });
                      }}
                    />
                  </div>
                  <select
                    className="field__input tf-row__sel"
                    disabled={!stmt}
                    value={
                      stmt
                        ? solution[k] === true
                          ? "T"
                          : solution[k] === false
                            ? "F"
                            : ""
                        : ""
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      const nextSol = { ...solution };
                      if (v === "T") nextSol[k] = true;
                      else if (v === "F") nextSol[k] = false;
                      else delete nextSol[k];
                      set("solution", nextSol);
                    }}
                  >
                    <option value="">—</option>
                    <option value="T">{t("createExercise.fields.tfTrue")}</option>
                    <option value="F">{t("createExercise.fields.tfFalse")}</option>
                  </select>
                </div>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {type === "openEnded" ? (
        <>
          <div className="field field--wide">
            <span className="field__label">{t("createExercise.fields.solution")}</span>
            <LatexInput
              multiline
              rows={3}
              maxLength={2048}
              value={(value.solution as string) ?? ""}
              onChange={(v) => set("solution", v)}
              required
            />
          </div>
          <div className="field field--wide">
            <span className="field__label">{t("createExercise.fields.steps")}</span>
            <StepsList
              value={(value.steps as string[]) ?? []}
              onChange={(v) => set("steps", v)}
            />
          </div>
        </>
      ) : null}

      {type === "matching" ? (
        <>
          <fieldset className="field">
            <legend className="field__label">
              {t("createExercise.fields.matchingRowFirst")}
            </legend>
            <div className="options-grid">
              {optionKeys.map((k) => {
                const first =
                  (value.optionsRowFirst as Record<string, string>) ?? {};
                const solution =
                  (value.solution as Record<string, number>) ?? {};
                return (
                  <div key={k} className="options-row">
                    <span className="options-row__key">{k}</span>
                    <div className="options-row__field">
                      <LatexInput
                        value={first[k] ?? ""}
                        onChange={(next) => {
                          const merged = { ...first, [k]: next };
                          const nextSol = { ...solution };
                          if (!next) {
                            delete merged[k];
                            delete nextSol[k];
                          }
                          onChange({
                            ...value,
                            optionsRowFirst: merged,
                            solution: nextSol,
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
          <fieldset className="field">
            <legend className="field__label">
              {t("createExercise.fields.matchingRowSecond")}
            </legend>
            <div className="options-grid">
              {["1", "2", "3", "4"].map((k) => {
                const second =
                  (value.optionsRowSecond as Record<string, string>) ?? {};
                const solution =
                  (value.solution as Record<string, number>) ?? {};
                return (
                  <div key={k} className="options-row">
                    <span className="options-row__key">{k}</span>
                    <div className="options-row__field">
                      <LatexInput
                        value={second[k] ?? ""}
                        onChange={(next) => {
                          const merged = { ...second, [k]: next };
                          const nextSol = { ...solution };
                          if (!next) {
                            delete merged[k];
                            for (const [row1Key, row2Idx] of Object.entries(
                              nextSol,
                            )) {
                              if (row2Idx === parseInt(k, 10))
                                delete nextSol[row1Key];
                            }
                          }
                          onChange({
                            ...value,
                            optionsRowSecond: merged,
                            solution: nextSol,
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
          <div className="field">
            <span className="field__label">
              {t("createExercise.fields.matchingPairs")}
            </span>
            <div className="matching-pairs">
              {optionKeys
                .filter(
                  (k) =>
                    ((value.optionsRowFirst as Record<string, string>) ?? {})[k],
                )
                .map((k) => {
                  const solution =
                    (value.solution as Record<string, number>) ?? {};
                  const second =
                    (value.optionsRowSecond as Record<string, string>) ?? {};
                  const availableRow2 = ["1", "2", "3", "4"].filter(
                    (r) => second[r],
                  );
                  return (
                    <div key={k} className="matching-pairs__row">
                      <span className="options-row__key">{k}</span>
                      <span className="matching-pairs__arrow">→</span>
                      <select
                        className="field__input matching-pairs__sel"
                        value={
                          solution[k] !== undefined ? String(solution[k]) : ""
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          const nextSol = { ...solution };
                          if (v === "") delete nextSol[k];
                          else nextSol[k] = parseInt(v, 10);
                          set("solution", nextSol);
                        }}
                      >
                        <option value="">—</option>
                        {availableRow2.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function CreateExercise() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEdit = Boolean(editId);
  const [prefilling, setPrefilling] = useState(Boolean(editId));

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [reqLoading, setReqLoading] = useState(false);
  const [detailedRequirementIds, setDetailedRequirementIds] = useState<string[]>([]);

  const [exerciseType, setExerciseType] = useState<ExerciseType>("singleChoice");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>("easy");
  const [maxPoints, setMaxPoints] = useState<number>(1);
  const [translationLang, setTranslationLang] = useState<Lang>("pl-PL");
  const [translations, setTranslations] = useState<Record<Lang, CreateExerciseTranslation>>({
    "pl-PL": emptyTranslation("pl-PL"),
    "en-GB": emptyTranslation("en-GB"),
  });
  const [files, setFiles] = useState<File[]>([]);
  const [existingIllustrations, setExistingIllustrations] = useState<
    NonNullable<ExerciseAdmin["illustrations"]>
  >([]);
  const [keptIllustrationIds, setKeptIllustrationIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrateFromExercise = useCallback((ex: ExerciseAdmin) => {
    setCategoryId(ex.categoryId);
    setDetailedRequirementIds(ex.detailedRequirementIds);
    setExerciseType(ex.exerciseType);
    setDifficultyLevel(ex.difficultyLevel);
    setMaxPoints(ex.maxPoints);
    setTranslations(translationsFromExercise(ex));
    const ill = ex.illustrations ?? [];
    setExistingIllustrations(ill);
    setKeptIllustrationIds(ill.map((i) => i.id));
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    listCategories(accessToken)
      .then((p) => setCategories(p.items))
      .catch((e: unknown) => {
        const err = e as ApiError;
        setError(err.detail ?? err.title ?? t("createExercise.loadCategoriesFailed"));
      });
  }, [accessToken, lang, t]);

  useEffect(() => {
    if (!accessToken || !editId) return;
    setPrefilling(true);
    getExercise(accessToken, editId)
      .then(hydrateFromExercise)
      .catch((e: unknown) => {
        const err = e as ApiError;
        setError(err.detail ?? err.title ?? i18n.t("createExercise.loadExerciseFailed"));
      })
      .finally(() => setPrefilling(false));
  }, [accessToken, editId, hydrateFromExercise, i18n]);

  useEffect(() => {
    if (!accessToken || !categoryId) {
      setRequirements([]);
      return;
    }
    setReqLoading(true);
    listRequirements(accessToken, categoryId)
      .then((p) => setRequirements(p.items))
      .catch(() => setRequirements([]))
      .finally(() => setReqLoading(false));
  }, [accessToken, categoryId, lang]);


  const filledTranslations = useMemo(
    () => LANGS.map((l) => translations[l.code]).filter(isTranslationFilled),
    [translations],
  );

  const canSubmit = useMemo(() => {
    if (!categoryId) return false;
    if (detailedRequirementIds.length === 0) return false;
    if (!maxPoints || maxPoints <= 0) return false;
    if (filledTranslations.length === 0) return false;
    return true;
  }, [categoryId, detailedRequirementIds, maxPoints, filledTranslations]);

  const onFilesChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles((prev) => [...prev, ...list].slice(0, 5));
    e.target.value = "";
  }, []);

  async function submit() {
    if (!accessToken || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const body: CreateExerciseBody = {
        categoryId,
        detailedRequirementIds,
        exerciseType,
        difficultyLevel,
        maxPoints,
        translations: filledTranslations,
      };
      if (isEdit && editId) {
        const patchBody: UpdateExerciseBody = {
          categoryId,
          detailedRequirementIds,
          difficultyLevel,
          maxPoints,
          translations: filledTranslations,
        };
        await updateExercise(accessToken, editId, patchBody);
        const removedIds = existingIllustrations
          .map((i) => i.id)
          .filter((id) => !keptIllustrationIds.includes(id));
        for (const rid of removedIds) {
          await deleteIllustration(accessToken, editId, rid);
        }
        if (files.length > 0) {
          await addIllustrations(accessToken, editId, files);
        }
        toast.success(t("createExercise.successUpdated"));
      } else {
        const created = await createExercise(accessToken, body);
        if (files.length > 0) {
          await addIllustrations(accessToken, created.id, files);
        }
        toast.success(t("createExercise.successCreated"));
      }
      navigate(`/exercises`, { replace: true });
    } catch (e: unknown) {
      const err = e as ApiError;
      const message =
        err.detail ??
        err.title ??
        (isEdit ? t("createExercise.failUpdate") : t("createExercise.failCreate"));
      toast.error(message);
      if (isEdit && editId && accessToken) {
        try {
          const ex = await getExercise(accessToken, editId);
          hydrateFromExercise(ex);
          setFiles([]);
        } catch {
          // resync itself failed; keep the on-screen state so the user can retry
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <header className="dashboard-hero">
        <div>
          <h1 className="dashboard-hero__title">
            {isEdit ? t("createExercise.titleEdit") : t("createExercise.titleNew")}
          </h1>
          <p className="dashboard-hero__lede">
            {isEdit ? t("createExercise.ledeEdit") : t("createExercise.ledeNew")}
          </p>
        </div>
        <div className="dashboard-hero__actions">
          <Button
            as="a"
            href="/exercises"
            variant="outline"
            className="hero-btn"
            leadingIcon={<ArrowLeft size={16} />}
          >
            {t("createExercise.backToExercises")}
          </Button>
        </div>
      </header>

      {error ? <div className="form-error">{error}</div> : null}

      <section className="card">
        <h2 className="card__section-title">{t("createExercise.topic")}</h2>
        <div className="create-form__grid">
          <label className="field">
            <span className="field__label">{t("createExercise.category")}</span>
            <select
              className="field__input"
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setDetailedRequirementIds([]);
              }}
              required
            >
              <option value="">{t("createExercise.categoryPlaceholder")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="field field--wide">
            <span className="field__label">
              {t("createExercise.requirements")}{" "}
              <span className="field__hint">{t("createExercise.requirementsHint")}</span>
            </span>
            <RequirementsPicker
              loading={reqLoading}
              requirements={requirements}
              selected={detailedRequirementIds}
              onChange={setDetailedRequirementIds}
              disabled={!categoryId}
            />
            {detailedRequirementIds.length > 0 ? (
              <ul className="req-chosen">
                {detailedRequirementIds.map((id) => {
                  const r = requirements.find((x) => x.id === id);
                  return (
                    <li key={id} className="req-chosen__row">
                      <span>{r?.definition ?? id}</span>
                      <button
                        type="button"
                        className="req-chosen__remove"
                        onClick={() =>
                          setDetailedRequirementIds((prev) =>
                            prev.filter((x) => x !== id),
                          )
                        }
                        aria-label={t("createExercise.removeRequirement")}
                      >
                        <X size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card">
        <h2 className="card__section-title">{t("createExercise.details")}</h2>
        <div className="create-form__grid">
          <label className="field">
            <span className="field__label">{t("createExercise.exerciseType")}</span>
            <select
              className="field__input"
              value={exerciseType}
              onChange={(e) => {
                setExerciseType(e.target.value as ExerciseType);
                setTranslations((prev) => ({
                  "pl-PL": {
                    languageCode: "pl-PL",
                    title: prev["pl-PL"].title,
                    description: prev["pl-PL"].description,
                  },
                  "en-GB": {
                    languageCode: "en-GB",
                    title: prev["en-GB"].title,
                    description: prev["en-GB"].description,
                  },
                }));
              }}
            >
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {t(`typeLabels.${ty}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">{t("createExercise.difficulty")}</span>
            <select
              className="field__input"
              value={difficultyLevel}
              onChange={(e) =>
                setDifficultyLevel(e.target.value as DifficultyLevel)
              }
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {t(`difficultyLabels.${d}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">{t("createExercise.maxPoints")}</span>
            <input
              className="field__input"
              type="number"
              min={0.5}
              step={0.5}
              value={maxPoints}
              onChange={(e) => setMaxPoints(parseFloat(e.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <div className="card__section-head">
          <h2 className="card__section-title">{t("createExercise.content")}</h2>
          <div className="lang-tabs" role="tablist" aria-label={t("createExercise.langTabs")}>
            {LANGS.map((l) => {
              const filled = isTranslationFilled(translations[l.code]);
              return (
                <button
                  key={l.code}
                  type="button"
                  role="tab"
                  aria-selected={translationLang === l.code}
                  className={`lang-tabs__btn${
                    translationLang === l.code ? " lang-tabs__btn--active" : ""
                  }`}
                  onClick={() => setTranslationLang(l.code)}
                >
                  {l.label}
                  {filled ? (
                    <span
                      className="lang-tabs__dot"
                      aria-label={t("createExercise.filled")}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <TranslationFields
          type={exerciseType}
          value={translations[translationLang]}
          onChange={(tr) =>
            setTranslations((prev) => ({ ...prev, [translationLang]: tr }))
          }
        />
      </section>

      <section className="card">
        <h2 className="card__section-title">{t("createExercise.images")}</h2>
        <div className="uploader">
          {existingIllustrations.length > 0 ? (
            <ul className="image-thumbs">
              {existingIllustrations
                .filter((ill) => keptIllustrationIds.includes(ill.id))
                .map((ill) => (
                  <li key={ill.id} className="image-thumb">
                    <img src={ill.uri} alt={ill.fileName ?? "illustration"} />
                    <button
                      type="button"
                      className="image-thumb__remove"
                      aria-label={t("createExercise.removeImage")}
                      title={t("createExercise.removeImage")}
                      onClick={() =>
                        setKeptIllustrationIds((prev) =>
                          prev.filter((id) => id !== ill.id),
                        )
                      }
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
            </ul>
          ) : null}
          <label className="uploader__drop">
            <Upload size={20} />
            <span>{t("createExercise.chooseImages")}</span>
            <span className="uploader__hint">
              {t("createExercise.imagesHint")}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onFilesChange}
              hidden
            />
          </label>
          {files.length > 0 ? (
            <ul className="uploader__list">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="uploader__row">
                  <span className="uploader__name" title={f.name}>
                    {f.name}
                  </span>
                  <span className="uploader__size">
                    {(f.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    type="button"
                    className="uploader__remove"
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, x) => x !== i))
                    }
                    aria-label={t("createExercise.removeFile")}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </section>

      <div className="create-form__submit">
        <Button
          as="a"
          href="/exercises"
          variant="ghost"
          className="hero-btn"
        >
          {t("createExercise.cancel")}
        </Button>
        <Button
          className="hero-btn"
          disabled={!canSubmit || submitting || prefilling}
          onClick={() => void submit()}
        >
          {submitting
            ? isEdit
              ? t("createExercise.saving")
              : t("createExercise.creating")
            : isEdit
              ? t("createExercise.saveChanges")
              : t("createExercise.createBtn")}
        </Button>
      </div>
    </AdminLayout>
  );
}
