import type { PbtiProfile } from "../data/pbtiProfiles";
import type { PbtiClassification } from "../logic/pbtiClassifier";
import { PbtiPosterCard } from "./PbtiPosterCard";

export function PbtiProfileDetail({
  profile,
  classification,
  totalHands,
}: {
  profile: PbtiProfile;
  classification?: PbtiClassification;
  totalHands?: number;
}) {
  const axisRows = [
    { label: "鸡轴", text: profile.axisSummary.first },
    { label: "钱轴", text: profile.axisSummary.second },
    { label: "术轴", text: profile.axisSummary.third },
  ];

  return (
    <section className="overflow-hidden rounded-[28px] border border-emerald-900/20 bg-[#f7faf7] p-3 shadow-2xl sm:p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(320px,0.86fr)_minmax(0,1.14fr)]">
        <PbtiPosterCard profile={profile} resultMode={Boolean(classification)} featured />

        <div className="flex min-h-[620px] flex-col rounded-[28px] border border-emerald-900/15 bg-white p-5 text-[#17241c] sm:p-8">
          <p className="text-sm font-black tracking-[0.12em] text-emerald-700">人格档案</p>
          <h2 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
            {profile.alias}
            <span className="block text-2xl text-[#4c5c51] sm:mt-2 sm:text-4xl">（{profile.title}）</span>
          </h2>
          <p className="mt-4 text-base font-bold text-[#657269]">{profile.vibeDescription}</p>
          <p className="mt-2 text-sm leading-6 text-[#738078]">{profile.tagline}</p>

          <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full border border-emerald-900/15 bg-[#edf3ed] px-3 py-1.5 text-emerald-900">{profile.code}</span>
            <span className="rounded-full border border-emerald-900/15 bg-[#edf3ed] px-3 py-1.5 text-emerald-900">
              代表人设：{profile.representative}
            </span>
            {classification && (
              <>
                <span className="rounded-full border border-emerald-900/15 bg-[#edf3ed] px-3 py-1.5 text-emerald-900">
                  画像强度：{classification.strengthLabel}
                </span>
                <span className="rounded-full border border-emerald-900/15 bg-[#edf3ed] px-3 py-1.5 text-emerald-900">
                  样本可信度：{classification.confidenceLabel}
                </span>
              </>
            )}
          </div>

          {typeof totalHands === "number" && totalHands < 5 && (
            <div className="mt-5 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-black text-red-800">
              当前样本较少，诊断仅供娱乐。
            </div>
          )}

          <div className="mt-auto grid gap-3 pt-8 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {axisRows.map((axis) => (
              <div key={axis.label} className="rounded-2xl border border-emerald-900/10 bg-[#f3f7f3] p-4">
                <p className="text-xs font-black tracking-[0.12em] text-emerald-700">{axis.label}</p>
                <p className="mt-2 text-sm font-bold leading-5 text-[#34443a]">{axis.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[28px] border border-emerald-900/15 bg-white p-5 text-[#17241c] sm:p-8">
        <h3 className="text-2xl font-black sm:text-3xl">人格描述</h3>
        <p className="mt-4 text-base leading-8 text-[#405047]">{profile.longDescription}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
            <h3 className="text-xs font-black tracking-[0.16em] text-amber-800">核心提醒</h3>
            <p className="mt-2 text-sm leading-6 text-amber-950">{profile.warning}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <h3 className="text-xs font-black tracking-[0.16em] text-red-700">常见死法</h3>
            <p className="mt-2 text-sm leading-6 text-red-950">{profile.deathPattern}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
