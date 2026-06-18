import { useState } from "react";
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
    <>
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        {profiles.map((profile) => (
          <MobileProfileTile key={profile.code} profile={profile} onSelect={onSelect} />
        ))}
      </div>

      <div className="hidden gap-5 sm:grid sm:grid-cols-2 xl:grid-cols-4">
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
    </>
  );
}

function MobileProfileTile({ profile, onSelect }: { profile: PbtiProfile; onSelect: (profile: PbtiProfile) => void }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      onClick={() => onSelect(profile)}
      aria-label={`查看${profile.title}档案`}
      className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-emerald-900/15 bg-[#edf3ed] text-left text-[#17241c] shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition active:scale-[0.98]"
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${profile.accent}`} />

      <div className="aspect-square w-full overflow-hidden bg-white">
        {!imageFailed ? (
          <img
            src={profile.avatar}
            alt=""
            className="h-full w-full object-contain"
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={`grid h-full place-items-center bg-gradient-to-br ${profile.accent}`}>
            <span className="text-lg font-black">{profile.code}</span>
          </div>
        )}
      </div>

      <div className="flex min-h-[94px] w-full flex-col p-2">
        <span className="truncate text-[10px] font-black text-emerald-800">{profile.code}</span>
        <span className="mt-0.5 line-clamp-2 text-sm font-black leading-4">{profile.title}</span>
        <span className="mt-1 truncate text-[11px] font-black tracking-[0.04em] text-emerald-600">{profile.alias}</span>
        <span className="mt-auto line-clamp-2 pt-1 text-[9px] font-bold leading-3 text-[#657269]">{profile.vibeDescription}</span>
      </div>
    </button>
  );
}
