import { useState } from "react";
import type { PbtiProfile } from "../data/pbtiProfiles";

export function PbtiPosterCard({
  profile,
  compact = false,
  resultMode = false,
  featured = false,
}: {
  profile: PbtiProfile;
  compact?: boolean;
  resultMode?: boolean;
  featured?: boolean;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article
      className={`relative isolate flex h-full flex-col overflow-hidden border border-emerald-900/15 bg-[#edf3ed] text-[#17241c] shadow-[0_18px_45px_rgba(0,0,0,0.25)] ${
        featured ? "min-h-[620px] rounded-[28px] p-5 sm:p-7" : "min-h-[420px] rounded-2xl p-4"
      }`}
    >
      <div className={`absolute inset-x-0 top-0 bg-gradient-to-r ${profile.accent} ${featured ? "h-1.5" : "h-2"}`} />
      <div className={`pt-2 ${featured ? "text-center" : "flex items-start justify-between gap-3"}`}>
        <p className={featured ? "text-base font-bold tracking-[0.08em] text-[#5e6d62]" : "text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500"}>
          {featured || resultMode ? "你的人格类型是：" : "PBTI PROFILE"}
        </p>
        {!featured && (
          <span className="rounded-md border border-zinc-900/15 bg-white/60 px-2 py-1 text-[10px] font-black tracking-[0.12em]">{profile.code}</span>
        )}
      </div>

      <div className={featured ? "mt-4 text-center" : "mt-3"}>
        <h2 className={`${featured ? "text-4xl sm:text-5xl" : compact ? "text-2xl" : "text-3xl"} font-black leading-tight`}>{profile.title}</h2>
        <p className={`${featured ? "mt-2 text-3xl" : "mt-1 text-base"} font-black tracking-[0.12em] text-emerald-600`}>{profile.alias}</p>
        {!featured && <p className="mt-1 text-xs font-bold leading-5 text-zinc-600">{profile.vibeDescription}</p>}
      </div>

      <div
        className={`relative flex flex-1 items-center justify-center overflow-hidden border border-emerald-950/5 bg-white ${
          featured ? "my-6 min-h-[360px] rounded-[22px]" : "my-4 min-h-[230px] rounded-xl"
        }`}
      >
        {!imageFailed ? (
          <img
            src={profile.avatar}
            alt={`${profile.title} 人格头像`}
            className={`h-full w-full object-contain ${featured ? "max-h-[440px]" : "max-h-[300px]"}`}
            loading="lazy"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className={`absolute inset-0 grid place-items-center bg-gradient-to-br ${profile.accent}`}>
            <div className="text-center text-zinc-950">
              <p className="text-5xl font-black">{profile.code}</p>
              <p className="mt-2 text-sm font-black tracking-[0.2em]">{profile.alias}</p>
            </div>
          </div>
        )}
      </div>

      <div className={featured ? "text-center" : "border-t border-zinc-900/15 pt-3"}>
        {featured && (
          <p className="text-sm font-black text-emerald-800">
            {profile.code} · {profile.vibeDescription}
          </p>
        )}
        <p className={`${featured ? "mt-2 text-base" : "text-sm"} font-bold leading-6 text-[#49564d]`}>{profile.tagline}</p>
      </div>
    </article>
  );
}
