import type { PbtiProfile } from "../data/pbtiProfiles";
import { PbtiPosterCard } from "./PbtiPosterCard";

export function PbtiProfileGrid({
  profiles,
  onSelect,
}: {
  profiles: PbtiProfile[];
  onSelect: (profile: PbtiProfile) => void;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {profiles.map((profile) => (
        <div key={profile.code} className="flex flex-col gap-3">
          <PbtiPosterCard profile={profile} compact />
          <div className="min-h-[68px]">
            <p className="text-sm font-black text-emerald-300">{profile.vibeDescription}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-zinc-400">{profile.shortDescription}</p>
          </div>
          <button
            onClick={() => onSelect(profile)}
            className="rounded-xl border border-amber-400/45 bg-amber-400/10 px-4 py-2.5 text-sm font-black text-amber-100 transition hover:bg-amber-300 hover:text-zinc-950"
          >
            查看档案
          </button>
        </div>
      ))}
    </div>
  );
}
