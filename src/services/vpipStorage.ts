import type { VpipAction, VpipHandRecord, VpipPosition } from "../logic/vpipTracker";

const VPIP_RECORDS_KEY = "pbti-vpip-records";
const VPIP_CURRENT_SESSION_KEY = "pbti-vpip-current-session";

const positions = new Set<VpipPosition>(["UTG", "MP", "HJ", "CO", "BTN", "SB", "BB"]);
const actions = new Set<VpipAction>(["Fold", "Check", "Call", "Raise"]);

export function loadVpipRecords(): VpipHandRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VPIP_RECORDS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isVpipHandRecord) : [];
  } catch {
    return [];
  }
}

export function saveVpipRecords(records: VpipHandRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VPIP_RECORDS_KEY, JSON.stringify(records.filter(isVpipHandRecord)));
}

export function clearVpipRecords() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(VPIP_RECORDS_KEY);
}

export function getCurrentVpipSessionId() {
  if (typeof window === "undefined") return createSessionId();
  const current = window.localStorage.getItem(VPIP_CURRENT_SESSION_KEY);
  if (current?.startsWith("vpip-")) return current;
  return createNewVpipSession();
}

export function createNewVpipSession() {
  const sessionId = createSessionId();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(VPIP_CURRENT_SESSION_KEY, sessionId);
  }
  return sessionId;
}

function createSessionId() {
  return `vpip-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function isVpipHandRecord(value: unknown): value is VpipHandRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<VpipHandRecord>;
  return Boolean(
    typeof record.id === "string" &&
      typeof record.sessionId === "string" &&
      positions.has(record.position as VpipPosition) &&
      actions.has(record.action as VpipAction) &&
      typeof record.timestamp === "number" &&
      Number.isFinite(record.timestamp),
  );
}
