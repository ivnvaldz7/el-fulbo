import Image from 'next/image';
import {
  applyBoostToStats,
  calculateBoostedOverall,
  getActiveBoost,
  isMvpBoost,
} from '@/lib/boost';
import type { CurrentBoost, PlayerPosition, PlayerStats } from '@/lib/types';
import { type CardTier, getCardTier } from '@/lib/utils/card-tiers';

type PlayerCardArtworkSize = 'compact' | 'preview' | 'share';

type PlayerCardArtworkProps = {
  name: string;
  position: PlayerPosition;
  stats: PlayerStats;
  currentBoost?: CurrentBoost | null;
  pending?: boolean;
  showBoostIndicator?: boolean;
  photoUrl?: string | null;
  groupName?: string;
  size?: PlayerCardArtworkSize;
};

type CardVisuals = {
  base: string;
  accent: string;
  ink: string;
  mutedInk: string;
  statInk: string;
  glow: string;
  line: string;
  frame: string;
  innerFrame: string;
  crest: string;
  depth: string;
  texture: string;
};

const tierVisuals: Record<CardTier, CardVisuals> = {
  bronce: {
    base: 'linear-gradient(150deg,#3a1d0c 0%,#a6632c 42%,#f0b069 58%,#2a1407 100%)',
    accent: '#f0b069',
    ink: 'text-[#ffe1aa]',
    mutedInk: 'text-[#f4c27d]/75',
    statInk: 'text-[#ffe7bb]',
    glow: 'rgba(240,176,105,0.32)',
    line: 'via-[#f0b069]/70',
    frame: 'linear-gradient(135deg,#301306 0%,#f2b873 18%,#7b421f 34%,#ffe0a7 48%,#4b210c 64%,#d88a43 82%,#241005 100%)',
    innerFrame: 'linear-gradient(135deg,#fff0c8,#8d4b22 28%,#f4bf7b 50%,#381707 74%,#ffd8a0)',
    crest: '#f5bd74',
    depth: 'rgba(34,15,4,0.78)',
    texture: 'rgba(255,221,159,0.24)',
  },
  plata: {
    base: 'linear-gradient(150deg,#202833 0%,#9eabb8 42%,#f4f7fb 58%,#171d25 100%)',
    accent: '#e7eef6',
    ink: 'text-[#f8fbff]',
    mutedInk: 'text-[#dce6ef]/75',
    statInk: 'text-[#f7fbff]',
    glow: 'rgba(231,238,246,0.34)',
    line: 'via-[#e7eef6]/75',
    frame: 'linear-gradient(135deg,#17202b 0%,#f8fbff 18%,#758493 34%,#ffffff 48%,#3a4551 64%,#dce6ef 82%,#111820 100%)',
    innerFrame: 'linear-gradient(135deg,#ffffff,#8795a4 28%,#f5f8fb 50%,#252f3b 74%,#eef5fb)',
    crest: '#f6fbff',
    depth: 'rgba(13,18,24,0.78)',
    texture: 'rgba(255,255,255,0.22)',
  },
  oro: {
    base: 'linear-gradient(150deg,#2d2105 0%,#8c6816 38%,#caa84a 58%,#211702 100%)',
    accent: '#d7b455',
    ink: 'text-[#f3dc91]',
    mutedInk: 'text-[#d7b455]/75',
    statInk: 'text-[#f1dda0]',
    glow: 'rgba(215,180,85,0.26)',
    line: 'via-[#d7b455]/70',
    frame: 'linear-gradient(135deg,#241803 0%,#d8b861 18%,#7c5a13 34%,#e2c979 48%,#5d4009 64%,#b78b25 82%,#1d1302 100%)',
    innerFrame: 'linear-gradient(135deg,#e4cf8a,#8b6515 28%,#c7a348 50%,#2f2004 74%,#dac070)',
    crest: '#d7b455',
    depth: 'rgba(36,23,1,0.78)',
    texture: 'rgba(215,180,85,0.2)',
  },
  oro_premium: {
    base: 'linear-gradient(150deg,#2f2200 0%,#d3a500 35%,#fff2a8 52%,#b67800 68%,#241600 100%)',
    accent: '#fff2a8',
    ink: 'text-[#fff7b7]',
    mutedInk: 'text-[#ffe66e]/80',
    statInk: 'text-[#fff9cf]',
    glow: 'rgba(255,242,168,0.48)',
    line: 'via-[#fff2a8]/85',
    frame: 'linear-gradient(135deg,#211500 0%,#fff7c4 14%,#c99300 28%,#fffdf0 44%,#9a6200 58%,#ffe168 74%,#3a2300 100%)',
    innerFrame: 'linear-gradient(135deg,#fffbe2,#d09f00 24%,#fff2a8 48%,#7a4a00 72%,#fff5be)',
    crest: '#fff2a8',
    depth: 'rgba(32,20,0,0.8)',
    texture: 'rgba(255,246,190,0.26)',
  },
};

const mvpVisuals: CardVisuals = {
  base: 'linear-gradient(150deg,#041520 0%,#0e7490 36%,#67e8f9 52%,#6d28d9 70%,#080a1f 100%)',
  accent: '#67e8f9',
  ink: 'text-[#bff7ff]',
  mutedInk: 'text-[#9ee7ff]/75',
  statInk: 'text-[#e2fbff]',
  glow: 'rgba(103,232,249,0.46)',
  line: 'via-[#67e8f9]/85',
  frame: 'linear-gradient(135deg,#071341 0%,#f9e68a 12%,#1539d6 25%,#77f7ff 38%,#fff6b0 51%,#2532aa 64%,#0f8eea 78%,#050819 100%)',
  innerFrame: 'linear-gradient(135deg,#fff2a8,#2244e8 22%,#6ff7ff 44%,#fff8bd 62%,#2530a0 82%,#dcecff)',
  crest: '#fff2a8',
  depth: 'rgba(2,8,34,0.82)',
  texture: 'rgba(103,232,249,0.22)',
};

const cardClipPath =
  'polygon(50% 0, 58% 3.6%, 85% 3.6%, 88% 9%, 100% 12%, 100% 83%, 94% 88%, 64% 94%, 50% 100%, 36% 94%, 6% 88%, 0 83%, 0 12%, 12% 9%, 15% 3.6%, 42% 3.6%)';

const innerClipPath =
  'polygon(50% 1.2%, 57% 4.2%, 84% 4.2%, 87% 9.5%, 98.2% 12.4%, 98.2% 82.2%, 92.6% 86.7%, 63% 92.8%, 50% 98.4%, 37% 92.8%, 7.4% 86.7%, 1.8% 82.2%, 1.8% 12.4%, 13% 9.5%, 16% 4.2%, 43% 4.2%)';

const previewClasses = {
  card: 'w-full max-w-[300px]',
  top: 'left-7 top-12',
  overall: 'text-5xl',
  position: 'text-sm',
  photo: 'top-[13%] h-[60%] px-4',
  fallbackHead: 'h-20 w-20',
  fallbackBody: 'h-32 w-40',
  name: 'text-2xl',
  nameBlock: 'bottom-[31%] px-5',
  stats: 'px-7 pb-8',
  statValue: 'text-[15px]',
  statLabel: 'text-[9px]',
  boost: 'text-[10px]',
};

const compactClasses = {
  card: 'w-full max-w-[250px]',
  top: 'left-6 top-10',
  overall: 'text-4xl',
  position: 'text-xs',
  photo: 'top-[13%] h-[60%] px-3',
  fallbackHead: 'h-16 w-16',
  fallbackBody: 'h-28 w-36',
  name: 'text-xl',
  nameBlock: 'bottom-[31%] px-4',
  stats: 'px-6 pb-7',
  statValue: 'text-sm',
  statLabel: 'text-[8px]',
  boost: 'text-[9px]',
};

const shareClasses = {
  card: 'h-[1800px] w-[1200px]',
  top: 'left-28 top-56',
  overall: 'text-[164px]',
  position: 'text-[42px]',
  photo: 'top-[13%] h-[60%] px-16',
  fallbackHead: 'h-[300px] w-[300px]',
  fallbackBody: 'h-[500px] w-[620px]',
  name: 'text-[94px]',
  nameBlock: 'bottom-[31%] px-24',
  stats: 'px-32 pb-28',
  statValue: 'text-[56px]',
  statLabel: 'text-[24px]',
  boost: 'text-[28px]',
};

function ArtworkFallback({
  name,
  size,
  visuals,
}: {
  name: string;
  size: typeof previewClasses;
  visuals: CardVisuals;
}) {
  return (
    <div
      aria-label={`Silueta de ${name}`}
      className="relative flex h-full w-full items-end justify-center overflow-hidden"
    >
      <div className={`absolute top-[13%] rounded-full bg-white/18 ${size.fallbackHead}`} />
      <div
        className={`absolute bottom-[10%] rounded-t-[45%] bg-white/16 ${size.fallbackBody}`}
        style={{ clipPath: 'polygon(30% 0, 70% 0, 92% 100%, 8% 100%)' }}
      />
      <div
        className="absolute inset-x-[18%] bottom-[7%] h-[38%] opacity-70 blur-2xl"
        style={{ background: `radial-gradient(circle, ${visuals.accent} 0%, transparent 70%)` }}
      />
    </div>
  );
}

export function PlayerCardArtwork({
  name,
  position,
  stats,
  currentBoost = null,
  pending = false,
  showBoostIndicator = true,
  photoUrl = null,
  groupName,
  size = 'preview',
}: PlayerCardArtworkProps) {
  const activeBoost = getActiveBoost(currentBoost);
  const boostedStats = applyBoostToStats(stats, activeBoost);
  const overall = calculateBoostedOverall(stats, position, activeBoost);
  const statEntries = Object.entries(stats);
  const highlightMvp = isMvpBoost(activeBoost);
  const visuals = highlightMvp ? mvpVisuals : tierVisuals[getCardTier(overall)];
  const scale = size === 'share' ? shareClasses : size === 'compact' ? compactClasses : previewClasses;

  return (
    <article
      aria-live="polite"
      className={`relative mx-auto aspect-[2/3] overflow-visible text-white drop-shadow-[0_26px_70px_rgba(0,0,0,0.5)] ${scale.card}`}
    >
      {highlightMvp ? (
        <>
          <div
            className="absolute -right-[12%] top-[12%] h-[28%] w-[22%] rotate-12 bg-cyan-300/55 blur-[1px]"
            style={{ clipPath: 'polygon(50% 0, 100% 28%, 78% 100%, 18% 82%, 0 24%)' }}
          />
          <div
            className="absolute -left-[8%] bottom-[9%] h-[20%] w-[17%] -rotate-12 bg-blue-500/55 blur-[1px]"
            style={{ clipPath: 'polygon(40% 0, 100% 36%, 72% 100%, 14% 86%, 0 20%)' }}
          />
        </>
      ) : null}

      <div className="absolute inset-0" style={{ clipPath: cardClipPath, background: visuals.frame }} />
      <div
        className="absolute inset-[2.2%] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42),inset_0_0_24px_rgba(255,255,255,0.16)]"
        style={{ clipPath: innerClipPath, background: visuals.innerFrame }}
      />
      <div
        className="absolute inset-[4.4%] overflow-hidden shadow-[inset_0_18px_28px_rgba(255,255,255,0.16),inset_0_-30px_40px_rgba(0,0,0,0.42)]"
        style={{ clipPath: innerClipPath, background: visuals.base }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_62%_18%,rgba(255,255,255,0.42),transparent_20%),linear-gradient(to_bottom,rgba(0,0,0,0.06),rgba(0,0,0,0.72))]" />
        <div
          className="absolute inset-x-0 top-[12%] h-[32%] opacity-80"
          style={{
            background: `linear-gradient(164deg, transparent 0%, ${visuals.texture} 38%, transparent 39%, transparent 47%, ${visuals.texture} 64%, transparent 66%)`,
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[58%] opacity-70"
          style={{ background: `radial-gradient(circle at 55% 32%, ${visuals.glow} 0%, transparent 52%)` }}
        />
        <div className="absolute inset-0 opacity-[0.18] bg-[linear-gradient(135deg,rgba(255,255,255,0.24)_0_1px,transparent_1px_18px)]" />
      </div>

      <div
        className="absolute left-1/2 top-[1.7%] z-40 flex h-[8.2%] w-[12%] -translate-x-1/2 items-center justify-center font-mono font-black uppercase tracking-[0.08em] text-[#2a2104] shadow-[0_5px_16px_rgba(0,0,0,0.38)]"
        style={{
          clipPath: 'polygon(50% 0, 92% 18%, 82% 76%, 50% 100%, 18% 76%, 8% 18%)',
          background: visuals.crest,
        }}
      >
        <span className={size === 'share' ? 'text-[30px]' : 'text-[8px]'}>EF</span>
      </div>

      <div className={`absolute z-30 ${scale.top}`}>
        <div>
          <p className={`font-headline font-black italic leading-none tracking-tighter drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)] ${visuals.ink} ${scale.overall}`}>
            {overall}
          </p>
          <p className={`mt-1 font-mono font-black uppercase tracking-[0.22em] ${visuals.mutedInk} ${scale.position}`}>
            {position}
          </p>
        </div>
      </div>

      <div className="absolute right-[9%] top-[8%] z-30 flex flex-col items-end gap-2">
          {pending ? (
            <span className={`font-mono font-black uppercase tracking-[0.18em] text-black ${scale.boost} bg-pitch-green px-2 py-1`}>
              Pendiente
            </span>
          ) : null}
          {highlightMvp ? (
            <span className={`bg-cyan-200 px-2 py-1 font-mono font-black uppercase tracking-[0.18em] text-[#06131f] ${scale.boost}`}>
              MVP
            </span>
          ) : null}
      </div>

      <div className={`absolute inset-x-[4.4%] z-10 ${scale.photo}`}>
        <div className="relative h-full w-full">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={name}
              fill
              sizes={size === 'share' ? '900px' : size === 'compact' ? '250px' : '360px'}
              className="object-cover object-top brightness-100 contrast-110 saturate-95"
              crossOrigin="anonymous"
              unoptimized
              style={{
                WebkitMaskImage:
                  'linear-gradient(to bottom, transparent 0%, black 9%, black 76%, transparent 100%), linear-gradient(to right, transparent 0%, black 9%, black 91%, transparent 100%)',
                WebkitMaskComposite: 'source-in',
                maskImage:
                  'linear-gradient(to bottom, transparent 0%, black 9%, black 76%, transparent 100%), linear-gradient(to right, transparent 0%, black 9%, black 91%, transparent 100%)',
                maskComposite: 'intersect',
              }}
            />
          ) : (
            <ArtworkFallback name={name} size={scale} visuals={visuals} />
          )}
        </div>
      </div>

      <div
        className="absolute inset-x-[4.4%] bottom-[4.4%] h-[50%] shadow-[0_-20px_34px_rgba(0,0,0,0.22)]"
        style={{
          clipPath: innerClipPath,
          background: `linear-gradient(to top, ${visuals.depth} 0%, rgba(0,0,0,0.72) 48%, transparent 100%)`,
        }}
      />

      <div className={`absolute inset-x-[4.4%] z-30 text-center ${scale.nameBlock}`}>
        <h2 className={`truncate font-headline font-black italic uppercase leading-none tracking-[0.08em] drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] ${visuals.ink} ${scale.name}`}>
          {name}
        </h2>
        <div className={`mx-auto mt-2 h-px w-[78%] bg-gradient-to-r from-transparent ${visuals.line} to-transparent`} />
        {groupName ? (
          <p className={`mt-3 font-mono font-black uppercase tracking-[0.22em] ${visuals.mutedInk} ${scale.boost}`}>
            {groupName}
          </p>
        ) : null}
      </div>

      <div className={`absolute inset-x-[4.4%] bottom-[4.4%] z-30 grid grid-cols-3 gap-x-4 gap-y-2 text-center ${scale.stats}`}>
        {statEntries.map(([key, value]) => {
          const boostDelta = activeBoost?.modifiers?.[key as keyof CurrentBoost['modifiers']] ?? 0;
          const boostedValue = boostedStats[key as keyof PlayerStats];

          return (
            <div key={key} className="min-w-0">
              <div className="flex items-baseline justify-center gap-1">
                <span className={`font-mono font-black leading-none drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)] ${visuals.statInk} ${scale.statValue}`}>
                  {Math.round(Number(boostedValue ?? value))}
                </span>
                {showBoostIndicator && boostDelta > 0 ? (
                  <span className={`font-mono font-black ${scale.boost}`} style={{ color: visuals.accent }}>
                    +{boostDelta}
                  </span>
                ) : null}
              </div>
              <p className={`mt-1 font-mono font-black uppercase tracking-[0.18em] ${visuals.mutedInk} ${scale.statLabel}`}>
                {key}
              </p>
            </div>
          );
        })}
      </div>
    </article>
  );
}
