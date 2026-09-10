"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  SettingRow,
  SettingSection,
  SettingsPageHeader,
  inputClass,
  nativeSelectClass,
} from "@/components/settings/shared";
import { Toggle } from "@/components/settings/Toggle";
import { useSettings } from "@/features/settings/store/SettingsStore";
import { apiFetch, apiUrl } from "@/lib/api";
import { EXTENSION_ENDPOINTS } from "@/lib/settings-extensions";

type GuestTrialSettings = {
  enabled: boolean;
  ttl_hours: number;
  turn_limit: number;
  token_limit: number;
  cost_limit_usd: number;
  concurrent_turn_limit: number;
  profile_id: string;
  model_id: string;
};

type ModelOption = {
  profile_id: string;
  model_id: string;
  profile_name: string;
  model_name: string;
  provider_label?: string;
};

type GuestTrialPayload = {
  settings: GuestTrialSettings;
  policy: {
    client_type: "mobile";
    allowed_capabilities: string[];
    allowed_tools: string[];
    attachments_allowed: boolean;
  };
  model_options: ModelOption[];
};

type GuestTrialRecord = {
  guest_id: string;
  status: string;
  created_at: number;
  expires_at: number;
  turns_used: number;
  turns_limit: number;
  tokens_used: number;
  tokens_limit: number;
  cost_used_usd: number;
  cost_limit_usd: number;
  claimed_by_user_id: string;
  claimed_at: number | null;
  claimed_session_count: number;
};

type GuestTrialListPayload = {
  total: number;
  items: GuestTrialRecord[];
};

function modelValue(option: Pick<ModelOption, "profile_id" | "model_id">) {
  return `${option.profile_id}\u0000${option.model_id}`;
}

function errorMessage(data: unknown, fallback: string) {
  if (!data || typeof data !== "object" || !("detail" in data)) return fallback;
  const detail = (data as { detail?: unknown }).detail;
  return typeof detail === "string" ? detail : fallback;
}

export default function GuestTrialSettingsPage() {
  const { t } = useTranslation();
  const { registerExtension, pendingExtensionPayload, draftRevision } =
    useSettings();
  const [payload, setPayload] = useState<GuestTrialPayload | null>(null);
  const [draft, setDraft] = useState<GuestTrialSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<GuestTrialListPayload | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [recordsRevision, setRecordsRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await apiFetch(
          apiUrl(EXTENSION_ENDPOINTS["guest-trial"]),
        );
        const data = (await response.json().catch(() => ({}))) as unknown;
        if (!response.ok) {
          throw new Error(
            errorMessage(data, t("Failed to load mobile trial settings.")),
          );
        }
        if (cancelled) return;
        const next = data as GuestTrialPayload;
        const pending = pendingExtensionPayload("guest-trial") as
          | GuestTrialSettings
          | undefined;
        setPayload(next);
        setDraft(pending ?? { ...next.settings });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [draftRevision, pendingExtensionPayload, t]);

  useEffect(() => {
    let cancelled = false;
    async function loadRecords() {
      setRecordsLoading(true);
      try {
        const response = await apiFetch(
          apiUrl("/api/settings/guest-trials?limit=50"),
        );
        const data = (await response.json().catch(() => ({}))) as unknown;
        if (!response.ok) {
          throw new Error(errorMessage(data, t("Failed to load guest usage.")));
        }
        if (!cancelled) setRecords(data as GuestTrialListPayload);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setRecordsLoading(false);
      }
    }
    loadRecords();
    return () => {
      cancelled = true;
    };
  }, [recordsRevision, t]);

  const dirty = useMemo(
    () => Boolean(payload && draft && JSON.stringify(payload.settings) !== JSON.stringify(draft)),
    [draft, payload],
  );

  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);
  const save = useCallback(async () => {
    const current = draftRef.current;
    if (!current) return;
    setError(null);
    try {
      const response = await apiFetch(
        apiUrl(EXTENSION_ENDPOINTS["guest-trial"]),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(current),
        },
      );
      const data = (await response.json().catch(() => ({}))) as unknown;
      if (!response.ok) {
        throw new Error(
          errorMessage(data, t("Failed to save mobile trial settings.")),
        );
      }
      const next = data as GuestTrialPayload;
      setPayload(next);
      setDraft({ ...next.settings });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    }
  }, [t]);

  useEffect(() => {
    registerExtension("guest-trial", { dirty, save, payload: draft });
    return () => registerExtension("guest-trial", null);
  }, [dirty, draft, registerExtension, save]);

  const setField = <K extends keyof GuestTrialSettings>(
    field: K,
    value: GuestTrialSettings[K],
  ) => setDraft((current) => (current ? { ...current, [field]: value } : current));

  const selectedModel = draft
    ? modelValue({ profile_id: draft.profile_id, model_id: draft.model_id })
    : "";

  const revoke = async (guestId: string) => {
    setRevoking(guestId);
    setError(null);
    try {
      const response = await apiFetch(
        apiUrl(`/api/settings/guest-trials/${encodeURIComponent(guestId)}/revoke`),
        { method: "POST" },
      );
      const data = (await response.json().catch(() => ({}))) as unknown;
      if (!response.ok) {
        throw new Error(errorMessage(data, t("Failed to revoke guest access.")));
      }
      setRecordsRevision((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div>
      <SettingsPageHeader
        title={t("Mobile trial")}
        description={t(
          "Let the mobile app open directly into a limited guest chat. Guest access is restricted to text chat and always uses the model selected here.",
        )}
      />

      {loading && (
        <div className="flex items-center gap-2 text-[13px] text-[var(--muted-foreground)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("Loading mobile trial settings...")}
        </div>
      )}

      {!loading && error && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-600 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && payload && draft && (
        <>
          <SettingSection
            title={t("Access")}
            description={t(
              "This setting affects the mobile app only. The web app still requires an account.",
            )}
          >
            <SettingRow
              title={t("Enable guest chat")}
              description={t(
                "New mobile installations receive a temporary guest identity and enter chat without seeing the login screen.",
              )}
              control={
                <Toggle
                  checked={draft.enabled}
                  onChange={(value) => setField("enabled", value)}
                />
              }
            />
            <SettingRow
              title={t("Trial model")}
              description={t(
                "Base trial turns and future ad rewards both use this administrator-funded model.",
              )}
              control={
                <select
                  className={`${nativeSelectClass} w-64 max-w-[48vw]`}
                  value={selectedModel}
                  onChange={(event) => {
                    const option = payload.model_options.find(
                      (item) => modelValue(item) === event.target.value,
                    );
                    setDraft((current) =>
                      current
                        ? {
                            ...current,
                            profile_id: option?.profile_id ?? "",
                            model_id: option?.model_id ?? "",
                          }
                        : current,
                    );
                  }}
                >
                  <option value="">{t("Select a configured model")}</option>
                  {payload.model_options.map((option) => (
                    <option key={modelValue(option)} value={modelValue(option)}>
                      {option.model_name} · {option.profile_name}
                    </option>
                  ))}
                </select>
              }
            />
          </SettingSection>

          <SettingSection
            title={t("Base allowance")}
            description={t(
              "A guest stops when any one of these limits is reached. Usage is recorded by the backend.",
            )}
          >
            <SettingRow
              title={t("Conversation turns")}
              description={t("Maximum completed assistant replies per installation.")}
              control={
                <input
                  className={`${inputClass} w-28`}
                  type="number"
                  min={1}
                  max={10000}
                  value={draft.turn_limit}
                  onChange={(event) => setField("turn_limit", Number(event.target.value))}
                />
              }
            />
            <SettingRow
              title={t("Token budget")}
              description={t("Maximum combined input and output tokens.")}
              control={
                <input
                  className={`${inputClass} w-36`}
                  type="number"
                  min={1}
                  max={100000000}
                  step={1000}
                  value={draft.token_limit}
                  onChange={(event) => setField("token_limit", Number(event.target.value))}
                />
              }
            />
            <SettingRow
              title={t("Cost ceiling (USD)")}
              description={t("Server-side safety ceiling for model cost.")}
              control={
                <input
                  className={`${inputClass} w-28`}
                  type="number"
                  min={0}
                  max={100000}
                  step={0.01}
                  value={draft.cost_limit_usd}
                  onChange={(event) => setField("cost_limit_usd", Number(event.target.value))}
                />
              }
            />
            <SettingRow
              title={t("Validity (hours)")}
              description={t("Time from the first guest session until it expires.")}
              control={
                <input
                  className={`${inputClass} w-28`}
                  type="number"
                  min={1}
                  max={8760}
                  value={draft.ttl_hours}
                  onChange={(event) => setField("ttl_hours", Number(event.target.value))}
                />
              }
            />
            <SettingRow
              title={t("Concurrent replies")}
              description={t("Maximum in-flight guest turns per installation.")}
              control={
                <input
                  className={`${inputClass} w-28`}
                  type="number"
                  min={1}
                  max={20}
                  value={draft.concurrent_turn_limit}
                  onChange={(event) =>
                    setField("concurrent_turn_limit", Number(event.target.value))
                  }
                />
              }
            />
          </SettingSection>

          <p className="text-[12px] leading-relaxed text-[var(--muted-foreground)]">
            {t(
              "Guest policy: text chat only. Tools, files, images, knowledge bases, research, solving, visualization, notes, memory, and model selection remain locked until login.",
            )}
          </p>

          <SettingSection
            title={t("Recent guest usage")}
            description={t(
              "The latest 50 mobile guest identities. Installation and network identifiers are stored only as salted hashes and are not displayed.",
            )}
          >
            {recordsLoading ? (
              <div className="flex items-center gap-2 py-4 text-[13px] text-[var(--muted-foreground)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("Loading guest usage...")}
              </div>
            ) : !records?.items.length ? (
              <p className="py-4 text-[13px] text-[var(--muted-foreground)]">
                {t("No guest trials have been created yet.")}
              </p>
            ) : (
              <div>
                {records.items.map((record) => (
                  <div
                    key={record.guest_id}
                    className="flex flex-col gap-3 border-t border-[var(--border)]/50 py-4 first:border-t-0 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] text-[var(--foreground)]">
                          {record.guest_id.slice(0, 18)}…
                        </span>
                        <span className="rounded-full bg-[var(--border)]/55 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                          {record.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                        {record.turns_used}/{record.turns_limit} {t("turns")} ·{" "}
                        {record.tokens_used.toLocaleString()}/
                        {record.tokens_limit.toLocaleString()} {t("tokens")} · $
                        {record.cost_used_usd.toFixed(4)}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                        {new Date(record.created_at * 1000).toLocaleString()}
                        {record.claimed_by_user_id
                          ? ` · ${t("Claimed by")} ${record.claimed_by_user_id} · ${record.claimed_session_count} ${t("sessions")}`
                          : ""}
                      </p>
                    </div>
                    {![
                      "claiming",
                      "claimed",
                      "revoked",
                      "expired",
                    ].includes(record.status) ? (
                      <button
                        type="button"
                        disabled={revoking === record.guest_id}
                        onClick={() => revoke(record.guest_id)}
                        className="self-start rounded-lg border border-red-500/25 px-3 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-500/10 disabled:opacity-50 sm:self-center"
                      >
                        {revoking === record.guest_id
                          ? t("Revoking...")
                          : t("Revoke")}
                      </button>
                    ) : null}
                  </div>
                ))}
                <p className="border-t border-[var(--border)]/50 pt-3 text-[11px] text-[var(--muted-foreground)]">
                  {t("Total guest identities")}: {records.total}
                </p>
              </div>
            )}
          </SettingSection>
        </>
      )}
    </div>
  );
}
