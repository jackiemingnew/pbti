import type { DecisionResult } from "../types";

export const actionLabels: Record<DecisionResult["action"], string> = {
  Fold: "过牌/弃牌",
  Check: "过牌/弃牌",
  Call: "跟注",
  Raise: "加注",
};

const actionClasses: Record<DecisionResult["action"], string> = {
  Check: "from-emerald-500 to-teal-800 shadow-emerald-900/50",
  Call: "from-sky-500 to-blue-900 shadow-blue-900/50",
  Raise: "from-red-500 to-rose-950 shadow-blood",
  Fold: "from-emerald-500 to-teal-800 shadow-emerald-900/50",
};

export function ActionChip({ action }: { action: DecisionResult["action"] }) {
  return (
    <div
      className={`inline-flex h-28 w-28 items-center justify-center rounded-full border-4 border-amber-200 bg-gradient-to-br ${actionClasses[action]} px-3 text-center text-2xl font-black tracking-wide text-white shadow-2xl`}
    >
      {actionLabels[action]}
    </div>
  );
}
