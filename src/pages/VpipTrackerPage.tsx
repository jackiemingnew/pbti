import { useMemo, useState } from "react";
import {
  calculateVpipStats,
  getVpipAdvice,
  VPIP_ACTIONS,
  VPIP_POSITIONS,
  type VpipAction,
  type VpipHandRecord,
  type VpipPosition,
} from "../logic/vpipTracker";
import {
  createNewVpipSession,
  getCurrentVpipSessionId,
  loadVpipRecords,
  saveVpipRecords,
} from "../services/vpipStorage";

const positionLabels: Record<VpipPosition, string> = {
  UTG: "UTG",
  MP: "MP",
  HJ: "HJ",
  CO: "CO / Cutoff",
  BTN: "BTN / Dealer",
  SB: "SB",
  BB: "BB",
};

const actionConfig: Record<
  VpipAction,
  { label: string; shortLabel: string; buttonClass: string; barClass: string }
> = {
  Fold: {
    label: "弃牌",
    shortLabel: "弃牌",
    buttonClass: "border-zinc-600 bg-zinc-800 text-zinc-100 hover:border-zinc-400 hover:bg-zinc-700",
    barClass: "bg-zinc-500",
  },
  Check: {
    label: "过牌 / BB 过牌",
    shortLabel: "过牌",
    buttonClass: "border-emerald-500/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-400 hover:text-zinc-950",
    barClass: "bg-emerald-500",
  },
  Call: {
    label: "跟注 / Limp",
    shortLabel: "跟注",
    buttonClass: "border-blue-500/50 bg-blue-500/15 text-blue-100 hover:bg-blue-400 hover:text-zinc-950",
    barClass: "bg-blue-500",
  },
  Raise: {
    label: "加注 / 3-bet",
    shortLabel: "加注",
    buttonClass: "border-red-500/50 bg-red-500/15 text-red-100 hover:bg-amber-400 hover:text-zinc-950",
    barClass: "bg-red-500",
  },
};

export function VpipTrackerPage({ onHome }: { onHome: () => void }) {
  const [records, setRecords] = useState<VpipHandRecord[]>(() => loadVpipRecords());
  const [sessionId, setSessionId] = useState(() => getCurrentVpipSessionId());
  const [selectedPosition, setSelectedPosition] = useState<VpipPosition | null>(null);
  const [notice, setNotice] = useState("先选位置，再记录这一手的翻前行为。");

  const sessionRecords = useMemo(
    () => records.filter((record) => record.sessionId === sessionId).sort((a, b) => a.timestamp - b.timestamp),
    [records, sessionId],
  );
  const stats = useMemo(() => calculateVpipStats(sessionRecords), [sessionRecords]);
  const advice = useMemo(() => getVpipAdvice(stats), [stats]);
  const sessionStartedAt = sessionStartTime(sessionId, sessionRecords);

  function persist(nextRecords: VpipHandRecord[]) {
    setRecords(nextRecords);
    saveVpipRecords(nextRecords);
  }

  function recordAction(action: VpipAction) {
    if (!selectedPosition) {
      setNotice("请先选择位置，再记录行为。");
      return;
    }
    const nextRecord: VpipHandRecord = {
      id: `vpip-hand-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      sessionId,
      position: selectedPosition,
      action,
      timestamp: Date.now(),
    };
    persist([...records, nextRecord]);
    setNotice(`已记录：${positionLabels[selectedPosition]} · ${actionConfig[action].label}`);
  }

  function undoLastHand() {
    const last = sessionRecords[sessionRecords.length - 1];
    if (!last) {
      setNotice("当前 Session 还没有可撤销的记录。");
      return;
    }
    persist(records.filter((record) => record.id !== last.id));
    setNotice(`已撤销：${positionLabels[last.position]} · ${actionConfig[last.action].shortLabel}`);
  }

  function clearCurrentSession() {
    if (!sessionRecords.length) {
      setNotice("当前 Session 已经是空的。");
      return;
    }
    if (!window.confirm("确定清空当前 Session 的全部 VPIP 记录吗？其他 Session 不受影响。")) return;
    persist(records.filter((record) => record.sessionId !== sessionId));
    setNotice("当前 Session 记录已清空。");
  }

  function startNewSession() {
    const nextSessionId = createNewVpipSession();
    setSessionId(nextSessionId);
    setSelectedPosition(null);
    setNotice("新 Session 已开始，请选择第一手的位置。");
  }

  function selectNextPosition() {
    const currentIndex = selectedPosition ? VPIP_POSITIONS.indexOf(selectedPosition) : -1;
    const nextPosition = VPIP_POSITIONS[(currentIndex + 1) % VPIP_POSITIONS.length];
    setSelectedPosition(nextPosition);
    setNotice(`已切换到 ${positionLabels[nextPosition]}。`);
  }

  const summaryMetrics = [
    { label: "总手数", value: String(stats.totalHands), helper: "当前 Session" },
    { label: "VPIP", value: `${stats.vpipPercent.toFixed(1)}%`, helper: `${stats.vpipHands} 手主动入池` },
    { label: "PFR", value: `${stats.pfrPercent.toFixed(1)}%`, helper: `${stats.pfrHands} 手翻前加注` },
    { label: "跟注率", value: `${stats.callPercent.toFixed(1)}%`, helper: `${stats.callHands} 手 Call / Limp` },
    { label: "加注率", value: `${stats.raisePercent.toFixed(1)}%`, helper: `${stats.raiseHands} 手 Raise` },
    { label: "弃牌率", value: `${stats.foldPercent.toFixed(1)}%`, helper: `${stats.foldHands} 手 Fold` },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5">
      <div className="rounded-3xl border border-amber-500/40 bg-zinc-950/90 p-4 shadow-2xl sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-500">Live Preflop Tracker</p>
            <h1 className="mt-2 text-3xl font-black text-amber-100 sm:text-5xl">线下 VPIP 记录器</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
              先选位置，再点行为。每记录一次行为，就算一手牌。Call 和 Raise 计入 VPIP，Raise 计入 PFR。
            </p>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              VPIP = Voluntarily Put Money In Pot。盲注本身不算 VPIP；主动 limp、跟注、加注、3-bet 才算。
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <button onClick={onHome} className="rounded-xl border border-zinc-700 px-3 py-2 text-sm font-bold text-zinc-200 transition hover:border-amber-400">
              回首页
            </button>
            <button onClick={startNewSession} className="rounded-xl border border-amber-500/50 px-3 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-500/15">
              新开 Session
            </button>
            <button onClick={undoLastHand} className="rounded-xl border border-blue-500/45 px-3 py-2 text-sm font-bold text-blue-100 transition hover:bg-blue-500/15">
              撤销上一手
            </button>
            <button onClick={clearCurrentSession} className="rounded-xl border border-red-500/45 px-3 py-2 text-sm font-bold text-red-100 transition hover:bg-red-500/15">
              清空本次记录
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-300">
            当前 Session：{sessionStartedAt}
          </span>
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-amber-200">{notice}</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/88 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">Step 1</p>
              <h2 className="mt-1 text-xl font-black text-amber-100">选择位置</h2>
            </div>
            <button onClick={selectNextPosition} className="rounded-lg border border-amber-500/45 px-3 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-400 hover:text-zinc-950">
              下一位置
            </button>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4">
            {VPIP_POSITIONS.map((position) => {
              const selected = selectedPosition === position;
              return (
                <button
                  key={position}
                  onClick={() => {
                    setSelectedPosition(position);
                    setNotice(`已选择 ${positionLabels[position]}。`);
                  }}
                  className={`min-h-16 rounded-xl border px-2 py-3 text-sm font-black transition ${
                    selected
                      ? "border-amber-200 bg-amber-400 text-zinc-950 shadow-gold"
                      : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-amber-500 hover:text-amber-100"
                  }`}
                >
                  {position}
                  {(position === "CO" || position === "BTN") && (
                    <span className="mt-1 block text-[10px] font-bold opacity-70">{position === "CO" ? "Cutoff" : "Dealer"}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/88 p-4 sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">Step 2</p>
          <h2 className="mt-1 text-xl font-black text-amber-100">记录翻前行为</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {VPIP_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => recordAction(action)}
                className={`min-h-24 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${actionConfig[action].buttonClass}`}
              >
                <span className="block text-lg font-black">{actionConfig[action].label}</span>
                <span className="mt-2 block text-xs font-semibold opacity-70">
                  {action === "Call" ? "计入 VPIP" : action === "Raise" ? "计入 VPIP + PFR" : "不计入 VPIP"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summaryMetrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-zinc-800 bg-zinc-950/88 p-4">
            <p className="text-xs font-black tracking-[0.16em] text-amber-500">{metric.label}</p>
            <p className="mt-2 text-3xl font-black text-amber-100">{metric.value}</p>
            <p className="mt-1 text-xs text-zinc-500">{metric.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-3xl border border-amber-500/25 bg-zinc-950/88 p-5">
          <h2 className="text-xl font-black text-amber-100">今日 VPIP 提醒</h2>
          <div className="mt-4 space-y-3">
            {advice.map((item) => (
              <p key={item} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm leading-6 text-zinc-300">
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-950/88 p-5">
          <h2 className="text-xl font-black text-amber-100">行为分布</h2>
          <div className="mt-4 space-y-4">
            {VPIP_ACTIONS.map((action) => {
              const count = action === "Fold" ? stats.foldHands : action === "Check" ? stats.checkHands : action === "Call" ? stats.callHands : stats.raiseHands;
              const actionPercent = stats.totalHands ? Math.round((count / stats.totalHands) * 1000) / 10 : 0;
              return (
                <div key={action}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-bold text-zinc-200">{actionConfig[action].shortLabel}</span>
                    <span className="text-zinc-500">{count} · {actionPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
                    <div className={`h-full rounded-full ${actionConfig[action].barClass}`} style={{ width: `${actionPercent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/88 p-4 sm:p-5">
        <h2 className="text-xl font-black text-amber-100">按位置统计</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-right text-sm">
            <thead className="text-xs text-zinc-500">
              <tr className="border-b border-zinc-800">
                <th className="px-3 py-3 text-left">位置</th>
                <th className="px-3 py-3">手数</th>
                <th className="px-3 py-3">VPIP</th>
                <th className="px-3 py-3">PFR</th>
                <th className="px-3 py-3">跟注</th>
                <th className="px-3 py-3">加注</th>
                <th className="px-3 py-3">弃牌 / 过牌</th>
              </tr>
            </thead>
            <tbody>
              {VPIP_POSITIONS.map((position) => {
                const item = stats.byPosition[position];
                return (
                  <tr key={position} className="border-b border-zinc-900 text-zinc-300">
                    <td className="px-3 py-3 text-left font-black text-amber-200">{positionLabels[position]}</td>
                    <td className="px-3 py-3">{item.totalHands}</td>
                    <td className="px-3 py-3">{item.vpipPercent.toFixed(1)}%</td>
                    <td className="px-3 py-3">{item.pfrPercent.toFixed(1)}%</td>
                    <td className="px-3 py-3">{item.callHands}</td>
                    <td className="px-3 py-3">{item.raiseHands}</td>
                    <td className="px-3 py-3">{item.foldHands} / {item.checkHands}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950/88 p-4 sm:p-5">
        <h2 className="text-xl font-black text-amber-100">最近记录</h2>
        {sessionRecords.length ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[...sessionRecords]
              .reverse()
              .slice(0, 10)
              .map((record, index) => (
                <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-zinc-600">#{stats.totalHands - index}</span>
                    <span className="font-black text-amber-200">{record.position}</span>
                    <span className="text-sm font-bold text-zinc-200">{actionConfig[record.action].shortLabel}</span>
                  </div>
                  <time className="text-xs text-zinc-500">{formatTime(record.timestamp)}</time>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-zinc-500">还没有记录。选好位置后，点一次行为按钮就记为一手。</p>
        )}
      </div>
    </section>
  );
}

function sessionStartTime(sessionId: string, records: VpipHandRecord[]) {
  const idTimestamp = Number(sessionId.split("-")[1]);
  const timestamp = Number.isFinite(idTimestamp) ? idTimestamp : records[0]?.timestamp;
  if (!timestamp) return "刚刚开始";
  const date = new Date(timestamp);
  return `${date.toLocaleDateString()} ${formatTime(timestamp)} 开始`;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}
