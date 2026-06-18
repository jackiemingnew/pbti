import { useMemo, useState } from "react";
import {
  calculateVpipStats,
  getVpipAdvice,
  VPIP_ACTIONS,
  VPIP_POSITIONS,
  type VpipAction,
  type VpipHandRecord,
  type VpipOutcome,
  type VpipPosition,
  type VpipStats,
} from "../logic/vpipTracker";
import { buildVpipSessionReport, type VpipAchievement, type VpipSessionReport } from "../logic/vpipReport";
import { getPbtiProfile } from "../data/pbtiProfiles";
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

const outcomeConfig: Record<VpipOutcome, { label: string; shortLabel: string; buttonClass: string; textClass: string }> = {
  none: {
    label: "未摊牌 / 先不记",
    shortLabel: "未摊牌",
    buttonClass: "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500",
    textClass: "text-zinc-500",
  },
  win: {
    label: "赢了",
    shortLabel: "赢",
    buttonClass: "border-emerald-500/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-400 hover:text-zinc-950",
    textClass: "text-emerald-300",
  },
  loss: {
    label: "输了",
    shortLabel: "输",
    buttonClass: "border-red-500/50 bg-red-500/15 text-red-100 hover:bg-red-400 hover:text-zinc-950",
    textClass: "text-red-300",
  },
};

const achievementToneClass: Record<VpipAchievement["tone"], string> = {
  gold: "border-amber-400/45 bg-amber-400/10 text-amber-100",
  red: "border-red-400/45 bg-red-500/10 text-red-100",
  blue: "border-blue-400/45 bg-blue-500/10 text-blue-100",
  green: "border-emerald-400/45 bg-emerald-500/10 text-emerald-100",
  purple: "border-fuchsia-400/45 bg-fuchsia-500/10 text-fuchsia-100",
};

export function VpipTrackerPage({ onHome }: { onHome: () => void }) {
  const [records, setRecords] = useState<VpipHandRecord[]>(() => loadVpipRecords());
  const [sessionId, setSessionId] = useState(() => getCurrentVpipSessionId());
  const [selectedPosition, setSelectedPosition] = useState<VpipPosition | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<VpipOutcome>("none");
  const [notice, setNotice] = useState("先选位置，再记录这一手的翻前行为。");
  const [showReport, setShowReport] = useState(false);

  const sessionRecords = useMemo(
    () => records.filter((record) => record.sessionId === sessionId).sort((a, b) => a.timestamp - b.timestamp),
    [records, sessionId],
  );
  const stats = useMemo(() => calculateVpipStats(sessionRecords), [sessionRecords]);
  const advice = useMemo(() => getVpipAdvice(stats), [stats]);
  const report = useMemo(() => buildVpipSessionReport(sessionRecords, stats), [sessionRecords, stats]);
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
      outcome: selectedOutcome,
      timestamp: Date.now(),
    };
    persist([...records, nextRecord]);
    setShowReport(false);
    setNotice(`已记录：${positionLabels[selectedPosition]} · ${actionConfig[action].label} · ${outcomeConfig[selectedOutcome].shortLabel}`);
  }

  function updateHandOutcome(recordId: string, outcome: VpipOutcome) {
    persist(records.map((record) => (record.id === recordId ? { ...record, outcome } : record)));
    setShowReport(false);
    setNotice(`已更新本手结果：${outcomeConfig[outcome].shortLabel}`);
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
    setSelectedOutcome("none");
    setShowReport(false);
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
    { label: "胜率", value: stats.resolvedHands ? `${stats.winRate.toFixed(1)}%` : "未标记", helper: `${stats.winHands} 赢 / ${stats.lossHands} 输` },
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
            <button
              onClick={() => setShowReport(true)}
              disabled={!sessionRecords.length}
              className="rounded-xl border border-fuchsia-500/50 px-3 py-2 text-sm font-bold text-fuchsia-100 transition hover:bg-fuchsia-500/15 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
            >
              生成本局战报
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

      {showReport && sessionRecords.length > 0 && <VpipSessionReportCard report={report} stats={stats} startedAt={sessionStartedAt} />}

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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="mt-1 text-xl font-black text-amber-100">记录翻前行为</h2>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(outcomeConfig) as VpipOutcome[]).map((outcome) => (
                <button
                  key={outcome}
                  onClick={() => setSelectedOutcome(outcome)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                    selectedOutcome === outcome
                      ? "border-amber-200 bg-amber-400 text-zinc-950"
                      : outcomeConfig[outcome].buttonClass
                  }`}
                >
                  {outcomeConfig[outcome].label}
                </button>
              ))}
            </div>
          </div>
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

      <div className="rounded-3xl border border-amber-500/25 bg-zinc-950/88 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-500">Achievement Wall</p>
            <h2 className="mt-1 text-xl font-black text-amber-100">本局成就墙</h2>
            {sessionRecords.length > 0 && (
              <p className="mt-2 text-sm font-bold text-zinc-400">
                {report.tableStatus.label}：<span className="text-amber-200">{report.tableStatus.title}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => setShowReport(true)}
            disabled={!sessionRecords.length}
            className="rounded-xl border border-amber-500/45 px-4 py-2 text-sm font-black text-amber-100 transition hover:bg-amber-400 hover:text-zinc-950 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:text-zinc-600"
          >
            查看截图战报
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {report.achievements.map((achievement) => (
            <div key={achievement.id} className={`rounded-2xl border p-4 ${achievementToneClass[achievement.tone]}`}>
              <p className="text-lg font-black">{achievement.title}</p>
              <p className="mt-2 text-sm leading-5 opacity-80">{achievement.description}</p>
            </div>
          ))}
        </div>
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
                <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-zinc-600">#{stats.totalHands - index}</span>
                    <span className="font-black text-amber-200">{record.position}</span>
                    <span className="text-sm font-bold text-zinc-200">{actionConfig[record.action].shortLabel}</span>
                    <span className={`text-xs font-black ${outcomeConfig[record.outcome || "none"].textClass}`}>
                      {outcomeConfig[record.outcome || "none"].shortLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(Object.keys(outcomeConfig) as VpipOutcome[]).map((outcome) => (
                      <button
                        key={outcome}
                        onClick={() => updateHandOutcome(record.id, outcome)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-black transition ${
                          (record.outcome || "none") === outcome
                            ? "border-amber-200 bg-amber-400 text-zinc-950"
                            : "border-zinc-700 text-zinc-400 hover:border-amber-500 hover:text-amber-100"
                        }`}
                      >
                        {outcomeConfig[outcome].shortLabel}
                      </button>
                    ))}
                    <time className="hidden text-xs text-zinc-500 sm:inline">{formatTime(record.timestamp)}</time>
                  </div>
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

function VpipSessionReportCard({
  report,
  stats,
  startedAt,
}: {
  report: VpipSessionReport;
  stats: VpipStats;
  startedAt: string;
}) {
  const profile = getPbtiProfile(report.classification.code);
  const topAchievements = report.achievements.slice(0, 3);

  return (
    <div className="overflow-hidden rounded-[2rem] border border-amber-400/45 bg-[radial-gradient(circle_at_20%_0%,rgba(245,158,11,0.28),transparent_32%),linear-gradient(135deg,rgba(9,9,11,0.98),rgba(24,24,27,0.94))] shadow-2xl">
      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-[420px] border-b border-amber-400/20 bg-zinc-950/70 p-5 lg:border-b-0 lg:border-r lg:p-7">
          <div className="absolute inset-x-8 top-8 h-32 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-amber-300">Session Report</p>
              <h2 className="mt-3 text-3xl font-black text-amber-50 sm:text-5xl">{report.tableStatus.title}</h2>
              <p className="mt-3 text-sm font-bold text-zinc-400">{startedAt}</p>
            </div>

            <div className="mt-8 rounded-3xl border border-amber-300/35 bg-black/35 p-5">
              <div className="flex items-center gap-4">
                <img src={profile.avatar} alt={profile.title} className="h-24 w-24 rounded-3xl border border-amber-300/40 bg-white object-cover shadow-gold" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">{profile.alias}</p>
                  <p className="mt-1 text-2xl font-black text-amber-50">{report.classification.code}</p>
                  <p className="text-xl font-black text-amber-200">{report.classification.title}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-300">{profile.vibeDescription}</p>
            </div>

            <p className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm font-bold leading-6 text-amber-50">
              {report.tableStatus.description}
            </p>
          </div>
        </div>

        <div className="p-5 lg:p-7">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ReportMetric label="VPIP" value={`${stats.vpipPercent.toFixed(1)}%`} helper={`${stats.vpipHands}/${stats.totalHands} 入池`} />
            <ReportMetric label="PFR" value={`${stats.pfrPercent.toFixed(1)}%`} helper={`${stats.pfrHands} 次加注`} />
            <ReportMetric label="胜率" value={stats.resolvedHands ? `${stats.winRate.toFixed(1)}%` : "--"} helper={`${stats.winHands} 赢 / ${stats.lossHands} 输`} />
            <ReportMetric label="样本" value={String(stats.totalHands)} helper={report.classification.confidenceLabel} />
          </div>

          <div className="mt-5 rounded-3xl border border-zinc-700/70 bg-black/28 p-5">
            <h3 className="text-xl font-black text-amber-100">系统判词</h3>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{report.verdict}</p>
            <p className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 p-3 text-sm font-bold leading-6 text-red-100">
              常见死法：{report.classification.deathPattern}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ScorePill label="鸡" value={report.scores.chicken} helper="主动/偷鸡" />
            <ScorePill label="钱" value={report.scores.money} helper="敢看/抗压" />
            <ScorePill label="术" value={report.scores.skill} helper="结构/位置" />
          </div>

          <div className="mt-5">
            <h3 className="text-xl font-black text-amber-100">本局成就</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {topAchievements.map((achievement) => (
                <div key={achievement.id} className={`rounded-2xl border p-4 ${achievementToneClass[achievement.tone]}`}>
                  <p className="text-base font-black">{achievement.title}</p>
                  <p className="mt-2 text-xs leading-5 opacity-80">{achievement.description}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-5 text-center text-xs font-bold text-zinc-500">本战报仅用于娱乐与策略思维训练，不构成赌博建议。</p>
        </div>
      </div>
    </div>
  );
}

function ReportMetric({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-zinc-700/70 bg-black/30 p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-amber-50">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function ScorePill({ label, value, helper }: { label: string; value: number; helper: string }) {
  return (
    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-black text-amber-100">{label}</span>
        <span className="text-2xl font-black text-amber-50">{value.toFixed(1)}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-200" style={{ width: `${Math.max(4, Math.min(100, value * 10))}%` }} />
      </div>
      <p className="mt-2 text-xs font-bold text-zinc-500">{helper}</p>
    </div>
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
