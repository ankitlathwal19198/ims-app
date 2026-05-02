"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaRandom,
  FaSave,
  FaLock,
  FaLockOpen,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useRouter } from "next/navigation";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchMasterData } from "@/store/slices/masterDataSlice";

/** ---------- helpers ---------- */
function norm(v: any) {
  return String(v ?? "").trim();
}
function onlyAZ09(s: string) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function slugCodeFromText(text: string, maxLen = 10) {
  const base = onlyAZ09(text);
  if (!base) return "";
  return base.slice(0, maxLen);
}
function uniqueCode(existing: Set<string>, base: string) {
  let code = base;
  if (!existing.has(code)) return code;

  for (let i = 2; i < 9999; i++) {
    const candidate = `${base}${i}`;
    if (!existing.has(candidate)) return candidate;
  }
  for (let i = 0; i < 5000; i++) {
    const candidate = `${base}${Math.floor(Math.random() * 90000 + 10000)}`;
    if (!existing.has(candidate)) return candidate;
  }
  return `${base}${Date.now()}`;
}
function clampLen(s: string, n: number) {
  const v = String(s ?? "");
  return v.length > n ? v.slice(0, n) : v;
}
function numOnly(input: string, allowDecimal = false) {
  const s = input.replace(/,/g, ".");
  const cleaned = allowDecimal ? s.replace(/[^0-9.]/g, "") : s.replace(/[^0-9]/g, "");
  if (!allowDecimal) return cleaned;
  const parts = cleaned.split(".");
  return parts.length <= 2 ? cleaned : `${parts[0]}.${parts.slice(1).join("")}`;
}

/** ---------- iOS/SaaS theme ---------- */
const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const card =
  "rounded-2xl border border-black/5 bg-white/80 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.06)]";
const subtleText = "text-black/55";
const softRing =
  "outline-none focus:ring-4 focus:ring-indigo-200/60 focus:border-indigo-200";
const inputBase =
  "h-11 w-full rounded-2xl border px-4 text-[14px] font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.05)] " +
  "bg-white text-black/90 placeholder:text-black/35 border-black/10 " +
  softRing;

type FormState = {
  item_code: string;
  description: string;
  hsn_code: string;
  pack_size: string;
  pack_type: string;
  unit: string;
  brand: string;
  design_type: string;

  avg_monthly_consumption_normal: string;
  avg_daily_consumption_peak: string;
  avg_monthly_consumption_off: string;

  lead_time: string;
  safety_factor: string;
  season: string;
  max_level: string;

  gram: string;
  stock: string;
};

const DEFAULT_FORM: FormState = {
  item_code: "",
  description: "",
  hsn_code: "",
  pack_size: "",
  pack_type: "",
  unit: "",
  brand: "",
  design_type: "PRIVATE LABEL",

  avg_monthly_consumption_normal: "",
  avg_daily_consumption_peak: "",
  avg_monthly_consumption_off: "",

  lead_time: "",
  safety_factor: "",
  season: "Normal",
  max_level: "",

  gram: "",
  stock: "",
};

/** ---------- Form Context ---------- */
const FormContext = React.createContext<{
  form: FormState;
  touched: Record<string, boolean>;
  requiredErrors: Record<string, string>;
  setField: (k: keyof FormState, v: string) => void;
  markTouched: (k: keyof FormState) => void;
  fieldRefs: React.RefObject<Record<string, HTMLDivElement | null>>;
  openSuggest: keyof FormState | null;
  setOpenSuggest: React.Dispatch<React.SetStateAction<keyof FormState | null>>;
} | null>(null);

const useFormContext = () => {
  const ctx = React.useContext(FormContext);
  if (!ctx) throw new Error("useFormContext must be used within FormContext.Provider");
  return ctx;
};

/** ---------- Sub-components ---------- */
const FieldWrap = ({ children, k }: { children: React.ReactNode; k: keyof FormState }) => {
  const { fieldRefs } = useFormContext();
  return (
    <div
      className="w-full max-w-[380px]"
      ref={(el) => {
        if (fieldRefs.current) {
          fieldRefs.current[String(k)] = el;
        }
      }}
    >
      {children}
    </div>
  );
};

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.22, ease: EASE_OUT }}
    className={`${card} p-4 md:p-5`}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-[14px] md:text-[15px] font-black text-black/90">{title}</div>
        <div className={`text-[12px] font-semibold ${subtleText}`}>{subtitle}</div>
      </div>
      <div className="hidden md:flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-indigo-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-fuchsia-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-4 justify-start">{children}</div>
  </motion.div>
);

const SuggestInput = ({
  label,
  k,
  placeholder,
  options,
  maxLen,
}: {
  label: string;
  k: keyof FormState;
  placeholder?: string;
  options: string[];
  maxLen?: number;
}) => {
  const {
    form,
    touched,
    requiredErrors,
    openSuggest,
    setOpenSuggest,
    setField,
    markTouched,
  } = useFormContext();

  const err = touched[k] ? requiredErrors[k] : "";
  const hasErr = Boolean(err);

  const filtered = useMemo(() => {
    const qq = norm(form[k]).toLowerCase();
    const base = options.filter(Boolean);
    if (!qq) return base.slice(0, 10);
    return base.filter((x) => x.toLowerCase().includes(qq)).slice(0, 10);
  }, [options, form, k]);

  return (
    <FieldWrap k={k}>
      <div className="relative flex flex-col gap-1">
        <label className={`text-[12px] font-extrabold ${subtleText}`}>{label}</label>

        <motion.div
          animate={hasErr ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.28 }}
        >
          <input
            value={form[k]}
            onFocus={() => setOpenSuggest(k)}
            onBlur={() => {
              markTouched(k);
              setTimeout(() => setOpenSuggest((p) => (p === k ? null : p)), 120);
            }}
            onChange={(e) => {
              let v = e.target.value;
              if (maxLen) v = clampLen(v, maxLen);
              setField(k, v);
              setOpenSuggest(k);
            }}
            placeholder={placeholder}
            className={[
              inputBase,
              hasErr ? "border-rose-400/60 focus:ring-rose-200/60 focus:border-rose-200" : "",
            ].join(" ")}
          />
        </motion.div>

        <AnimatePresence>
          {openSuggest === k && filtered.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="absolute top-[66px] left-0 right-0 z-40 overflow-hidden rounded-2xl border border-black/10 bg-white/95 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.14)]"
            >
              {filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setField(k, o);
                    setOpenSuggest(null);
                  }}
                  className="w-full text-left px-4 py-2.5 text-[13px] font-semibold hover:bg-black/5 text-black/80"
                >
                  {o}
                </button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {hasErr ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="text-[12px] font-extrabold text-rose-700 inline-flex items-center gap-2"
            >
              <FaExclamationTriangle /> {err}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </FieldWrap>
  );
};

const Field = ({
  label,
  k,
  placeholder,
  inputMode,
  sanitize,
  maxLen,
  right,
}: {
  label: string;
  k: keyof FormState;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  sanitize?: (s: string) => string;
  maxLen?: number;
  right?: React.ReactNode;
}) => {
  const { form, touched, requiredErrors, setField, markTouched } = useFormContext();
  const err = touched[k] ? requiredErrors[k] : "";
  const hasErr = Boolean(err);

  return (
    <FieldWrap k={k}>
      <div className="flex flex-col gap-1">
        <label className={`text-[12px] font-extrabold ${subtleText}`}>{label}</label>

        <motion.div
          animate={hasErr ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.28 }}
          className="flex items-stretch gap-2"
        >
          <input
            value={form[k]}
            inputMode={inputMode}
            onBlur={() => markTouched(k)}
            onChange={(e) => {
              let v = e.target.value;
              if (sanitize) v = sanitize(v);
              if (maxLen) v = clampLen(v, maxLen);
              setField(k, v);
            }}
            placeholder={placeholder}
            className={[
              inputBase,
              hasErr ? "border-rose-400/60 focus:ring-rose-200/60 focus:border-rose-200" : "",
            ].join(" ")}
          />
          {right}
        </motion.div>

        <AnimatePresence>
          {hasErr ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="text-[12px] font-extrabold text-rose-700 inline-flex items-center gap-2"
            >
              <FaExclamationTriangle /> {err}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </FieldWrap>
  );
};

const SelectField = ({
  label,
  k,
  options,
}: {
  label: string;
  k: keyof FormState;
  options: string[];
}) => {
  const { form, touched, requiredErrors, setField, markTouched } = useFormContext();
  const err = touched[k] ? requiredErrors[k] : "";
  const hasErr = Boolean(err);

  return (
    <FieldWrap k={k}>
      <div className="flex flex-col gap-1">
        <label className={`text-[12px] font-extrabold ${subtleText}`}>{label}</label>

        <motion.select
          animate={hasErr ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.28 }}
          value={form[k]}
          onBlur={() => markTouched(k)}
          onChange={(e) => setField(k, e.target.value)}
          className={[
            "h-11 w-full rounded-2xl border px-4 text-[14px] font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.05)]",
            "bg-white text-black/90 border-black/10",
            softRing,
            hasErr ? "border-rose-400/60 focus:ring-rose-200/60 focus:border-rose-200" : "",
          ].join(" ")}
        >
          <option value="">Select</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </motion.select>

        <AnimatePresence>
          {hasErr ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="text-[12px] font-extrabold text-rose-700 inline-flex items-center gap-2"
            >
              <FaExclamationTriangle /> {err}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </FieldWrap>
  );
};

export default function IMSMasterAddPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const master = useAppSelector((s) => s.masterData.data);
  const loading = useAppSelector((s) => s.masterData.loading);
  const error = useAppSelector((s) => s.masterData.error);

  // useEffect(() => {
  //   dispatch(fetchMasterData());
  // }, [dispatch]);

  const rows = useMemo(() => (Array.isArray(master) ? (master as any[]) : []), [master]);

  const existingCodes = useMemo(() => {
    return new Set(rows.map((r) => norm(r.item_code).toUpperCase()).filter(Boolean));
  }, [rows]);

  const brandOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => norm(r.brand)).filter(Boolean))).sort();
  }, [rows]);

  const packTypeOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => norm(r.pack_type)).filter(Boolean))).sort();
  }, [rows]);

  const unitOptions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => norm(r.unit)).filter(Boolean))).sort();
  }, [rows]);

  const designTypeOptions = useMemo(() => {
    const base = Array.from(new Set(rows.map((r) => norm(r.design_type)).filter(Boolean))).sort();
    return base.length ? base : ["PRIVATE LABEL", "STANDARD", "GENERIC"];
  }, [rows]);

  const seasonOptions = useMemo(() => ["Normal", "Peak", "Off", "Seasonal"], []);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  const [codeLocked, setCodeLocked] = useState(false);
  const [saveMode, setSaveMode] = useState<"stay" | "back">("stay");
  const [openSuggest, setOpenSuggest] = useState<null | keyof FormState>(null);

  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const setField = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const markTouched = (k: keyof FormState) => setTouched((p) => ({ ...p, [k]: true }));

  const codeUpper = norm(form.item_code).toUpperCase();
  const isCodeDuplicate = codeUpper ? existingCodes.has(codeUpper) : false;

  const requiredErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!norm(form.item_code)) errs.item_code = "Item Code is required";
    if (!norm(form.description)) errs.description = "Description is required";
    if (!norm(form.hsn_code)) errs.hsn_code = "HSN Code is required";
    if (!norm(form.pack_size)) errs.pack_size = "Pack Size is required";
    if (!norm(form.pack_type)) errs.pack_type = "Pack Type is required";
    if (!norm(form.unit)) errs.unit = "Unit is required";
    if (!norm(form.brand)) errs.brand = "Brand is required";
    if (!norm(form.design_type)) errs.design_type = "Design Type is required";
    if (isCodeDuplicate) errs.item_code = "Item Code already exists (must be unique)";
    return errs;
  }, [form, isCodeDuplicate]);

  const totalRequired = 8;
  const filledRequired =
    (norm(form.item_code) ? 1 : 0) +
    (norm(form.description) ? 1 : 0) +
    (norm(form.hsn_code) ? 1 : 0) +
    (norm(form.pack_size) ? 1 : 0) +
    (norm(form.pack_type) ? 1 : 0) +
    (norm(form.unit) ? 1 : 0) +
    (norm(form.brand) ? 1 : 0) +
    (norm(form.design_type) ? 1 : 0);

  const progress = Math.round((filledRequired / totalRequired) * 100);
  const canSubmit = Object.keys(requiredErrors).length === 0 && !submitting;

  /** auto-generate item_code */
  useEffect(() => {
    if (codeLocked) return;
    if (touched.item_code) return;

    const brand = slugCodeFromText(form.brand || "ITEM", 6);
    const pack = slugCodeFromText(form.pack_size || "", 5);
    const hint = slugCodeFromText(form.design_type || "", 2);

    const base = clampLen(`${brand}${pack}${hint}` || "ITEM", 12) || "ITEM";
    const code = uniqueCode(existingCodes, base);

    setForm((p) => ({ ...p, item_code: code }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.brand, form.pack_size, form.design_type, existingCodes, codeLocked]);

  const generateUnique = () => {
    const brand = slugCodeFromText(form.brand || "ITEM", 6);
    const pack = slugCodeFromText(form.pack_size || "", 5);
    const hint = slugCodeFromText(form.design_type || "", 2);
    const base = clampLen(`${brand}${pack}${hint}` || "ITEM", 12) || "ITEM";
    const code = uniqueCode(existingCodes, base);

    setForm((p) => ({ ...p, item_code: code }));
    setTouched((p) => ({ ...p, item_code: true }));
  };

  const scrollToFirstError = (errs: Record<string, string>) => {
    const firstKey = Object.keys(errs)[0];
    const el = fieldRefs.current[firstKey];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /** Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdEnter = (e.metaKey || e.ctrlKey) && e.key === "Enter";
      if (isCmdEnter) {
        e.preventDefault();
        if (canSubmit) submit();
      }
      if (e.key === "Escape") router.push("/ims-master");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSubmit, form, requiredErrors, saveMode]);

  const doSave = async () => {
    const payload = {
      item_code: norm(form.item_code).toUpperCase(),
      description: norm(form.description),
      hsn_code: norm(form.hsn_code),
      pack_size: norm(form.pack_size),
      pack_type: norm(form.pack_type),
      unit: norm(form.unit),
      brand: norm(form.brand),
      design_type: norm(form.design_type),

      avg_monthly_consumption_normal: norm(form.avg_monthly_consumption_normal),
      avg_daily_consumption_peak: norm(form.avg_daily_consumption_peak),
      avg_monthly_consumption_off: norm(form.avg_monthly_consumption_off),

      lead_time: norm(form.lead_time),
      safety_factor: norm(form.safety_factor),
      season: norm(form.season),
      max_level: norm(form.max_level),

      gram: norm(form.gram),
      stock: norm(form.stock),
    };

    // await dispatch(addMasterItem(payload)).unwrap();
    console.log("SUBMIT MASTER ITEM:", payload);
  };

  const submit = async () => {
    setSaved(false);

    const mustTouch: (keyof FormState)[] = [
      "item_code",
      "description",
      "hsn_code",
      "pack_size",
      "pack_type",
      "unit",
      "brand",
      "design_type",
    ];
    setTouched((p) => {
      const next = { ...p };
      mustTouch.forEach((k) => (next[k] = true));
      return next;
    });

    if (Object.keys(requiredErrors).length) {
      scrollToFirstError(requiredErrors);
      return;
    }

    setSubmitting(true);
    try {
      await doSave();
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);

      if (saveMode === "stay") {
        setForm(DEFAULT_FORM);
        setTouched({});
        setCodeLocked(false);
      } else {
        router.push("/ims-master");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormContext.Provider
      value={{
        form,
        touched,
        requiredErrors,
        setField,
        markTouched,
        fieldRefs,
        openSuggest,
        setOpenSuggest,
      }}
    >
      <div className="relative px-4 md:px-6 pb-32 pt-5">
        {/* iOS-ish colorful background */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-24 left-1/2 h-72 w-[820px] -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/60 via-fuchsia-200/50 to-emerald-200/50 blur-3xl" />
          <div className="absolute top-40 left-1/2 h-72 w-[720px] -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-200/35 via-indigo-200/30 to-pink-200/30 blur-3xl" />
        </div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="mx-auto max-w-[1200px] flex flex-col gap-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/ims-master")}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-[13px] font-black hover:bg-black/5"
              >
                <FaArrowLeft /> Back
              </button>

              <div>
                <h1 className="text-[18px] md:text-[22px] font-black tracking-tight text-black/90">
                  Add IMS Master Item
                </h1>
                <div className={`text-[12px] font-semibold ${subtleText}`}>
                  iOS inspired • minimal SaaS form • Ctrl/⌘+Enter save
                </div>
              </div>
            </div>

            {/* progress */}
            <div className="min-w-[220px] flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <div className={`text-[12px] font-extrabold ${subtleText}`}>Completion</div>
                <div className="text-[12px] font-extrabold text-black/80">{progress}%</div>
              </div>
              <div className="h-2 rounded-full bg-black/10 overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 220, damping: 26 }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-emerald-500"
                />
              </div>
            </div>

            {/* success toast */}
            <motion.div animate={saved ? { opacity: 1, y: 0 } : { opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/12 px-3 py-2 text-[13px] font-black text-emerald-800">
                <FaCheckCircle /> Saved
              </div>
            </motion.div>
          </div>

          {error && !loading && (
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-rose-800">
              {error}
            </div>
          )}
        </motion.div>

        {/* FORM */}
        <div className="mx-auto max-w-[1200px] mt-4 flex flex-col gap-3">
          <Section title="Core Details" subtitle="Identity fields + smart suggestions.">
            <Field
              label="Item Code"
              k="item_code"
              placeholder="AUTO GENERATED"
              maxLen={16}
              sanitize={(s) => onlyAZ09(s)}
              right={
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setCodeLocked((p) => !p)}
                    className="h-11 rounded-2xl border border-black/10 bg-white/80 px-3 text-[13px] font-black hover:bg-black/5 inline-flex items-center gap-2"
                    title={codeLocked ? "Unlock auto code" : "Lock this code"}
                  >
                    {codeLocked ? <FaLock /> : <FaLockOpen />}
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={generateUnique}
                    className="h-11 rounded-2xl border border-black/10 bg-white/80 px-3 text-[13px] font-black hover:bg-black/5 inline-flex items-center gap-2"
                    title="Generate unique code"
                  >
                    <FaRandom /> Generate
                  </motion.button>
                </div>
              }
            />

            <Field label="Description" k="description" placeholder="e.g. Buyer Marking 35Kg Nonwoven" />
            <Field label="HSN Code" k="hsn_code" placeholder="e.g. 3923" maxLen={12} />

            <Field label="Pack Size" k="pack_size" placeholder="e.g. 35Kg / 10Kg" maxLen={16} />
            <SuggestInput
              label="Pack Type"
              k="pack_type"
              placeholder="Start typing to search..."
              options={packTypeOptions.length ? packTypeOptions : ["BOPP", "HDPE", "NONWOVEN", "JAR", "PLASTIC POUCH"]}
              maxLen={24}
            />
            <SuggestInput
              label="Unit"
              k="unit"
              placeholder="Start typing to search..."
              options={unitOptions.length ? unitOptions : ["Kg", "Pcs"]}
              maxLen={10}
            />

            <SuggestInput
              label="Brand"
              k="brand"
              placeholder="Start typing to search brand..."
              options={brandOptions.length ? brandOptions : ["Buyer Marking", "AL HODHOD"]}
              maxLen={30}
            />
            <SelectField label="Design Type" k="design_type" options={designTypeOptions} />
          </Section>

          <Section title="Consumption" subtitle="Forecast inputs (numbers only).">
            <Field
              label="Avg Monthly Consumption (Normal)"
              k="avg_monthly_consumption_normal"
              placeholder="number"
              inputMode="decimal"
              sanitize={(s) => numOnly(s, true)}
            />
            <Field
              label="Avg Daily Consumption (Peak)"
              k="avg_daily_consumption_peak"
              placeholder="number"
              inputMode="decimal"
              sanitize={(s) => numOnly(s, true)}
            />
            <Field
              label="Avg Monthly Consumption (Off)"
              k="avg_monthly_consumption_off"
              placeholder="number"
              inputMode="decimal"
              sanitize={(s) => numOnly(s, true)}
            />
          </Section>

          <Section title="Planning" subtitle="Lead time + safety.">
            <Field label="Lead Time (days)" k="lead_time" placeholder="e.g. 7" inputMode="numeric" sanitize={(s) => numOnly(s)} />
            <Field label="Safety Factor" k="safety_factor" placeholder="number" inputMode="decimal" sanitize={(s) => numOnly(s, true)} />
            <SelectField label="Season" k="season" options={seasonOptions} />
            <Field label="Max Level" k="max_level" placeholder="number" inputMode="decimal" sanitize={(s) => numOnly(s, true)} />
          </Section>

          <Section title="Inventory" subtitle="Stock + weight.">
            <Field label="Gram" k="gram" placeholder="number" inputMode="decimal" sanitize={(s) => numOnly(s, true)} />
            <Field label="Stock" k="stock" placeholder="number" inputMode="decimal" sanitize={(s) => numOnly(s, true)} />
          </Section>

          <div className={`text-[12px] font-semibold ${subtleText} px-1`}>
            Tips: Ctrl/⌘ + Enter to save • Esc to cancel • Brand/Pack/Unit searchable
          </div>
        </div>

        {/* Sticky Action Bar (minimal) */}
        <div className="fixed inset-x-0 bottom-0 z-50">
          <div className="mx-auto max-w-[1200px] px-4 md:px-6 pb-4">
            <div className={`${card} px-4 py-3 flex flex-wrap items-center justify-end gap-3`}>
              {/* Save mode toggle */}
              <div className="flex items-center rounded-2xl border border-black/10 bg-white/70 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setSaveMode("stay")}
                  className={[
                    "px-3 h-11 text-[12px] font-black",
                    saveMode === "stay"
                      ? "bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-emerald-600 text-white"
                      : "text-black/70 hover:bg-black/5",
                  ].join(" ")}
                >
                  Add Another
                </button>
                <button
                  type="button"
                  onClick={() => setSaveMode("back")}
                  className={[
                    "px-3 h-11 text-[12px] font-black",
                    saveMode === "back"
                      ? "bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-emerald-600 text-white"
                      : "text-black/70 hover:bg-black/5",
                  ].join(" ")}
                >
                  Save & Back
                </button>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => router.push("/ims-master")}
                className="h-11 rounded-2xl border border-black/10 bg-white/70 px-4 text-[13px] font-black hover:bg-black/5 text-black/80"
              >
                Cancel
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={!canSubmit}
                type="button"
                onClick={() => {
                  if (!canSubmit) {
                    const errs = requiredErrors;
                    if (Object.keys(errs).length) scrollToFirstError(errs);
                    return;
                  }
                  submit();
                }}
                className={[
                  "h-11 rounded-2xl px-4 text-[13px] font-black inline-flex items-center gap-2",
                  "border border-black/10 shadow-[0_10px_24px_rgba(0,0,0,0.10)]",
                  canSubmit
                    ? "bg-black text-white hover:bg-black/90"
                    : "bg-black/30 text-white/70 cursor-not-allowed",
                ].join(" ")}
              >
                <FaSave /> {submitting ? "Saving..." : "Save Item"}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </FormContext.Provider>
  );

}
