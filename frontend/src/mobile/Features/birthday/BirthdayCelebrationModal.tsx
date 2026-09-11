import { Cake, Crown, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { HubBirthday } from "@/model/hub-model";

const FIREWORK_PARTICLES = Array.from({ length: 12 }, (_, index) => index);
const FIREWORK_COLORS = [
  "#f43f5e",
  "#fb7185",
  "#fb923c",
  "#facc15",
  "#38bdf8",
  "#a78bfa",
  "#34d399",
] as const;
const FIREWORK_BURSTS = [
  { side: "left", x: "6%", y: "74%", delay: 120, distance: 46 },
  { side: "left", x: "18%", y: "61%", delay: 360, distance: 38 },
  { side: "left", x: "28%", y: "49%", delay: 600, distance: 32 },
  { side: "right", x: "94%", y: "74%", delay: 260, distance: 46 },
  { side: "right", x: "82%", y: "60%", delay: 500, distance: 38 },
  { side: "right", x: "72%", y: "48%", delay: 740, distance: 32 },
] as const;
const CARD_CONFETTI = [
  { left: "8%", top: "13%", color: "#f43f5e", rotate: "-18deg", delay: "820ms", w: 5, h: 10, shape: "2px" },
  { left: "16%", top: "8%", color: "#f59e0b", rotate: "26deg", delay: "880ms", w: 6, h: 6, shape: "999px" },
  { left: "25%", top: "15%", color: "#38bdf8", rotate: "64deg", delay: "920ms", w: 4, h: 12, shape: "2px" },
  { left: "37%", top: "9%", color: "#a78bfa", rotate: "-36deg", delay: "960ms", w: 5, h: 8, shape: "1px" },
  { left: "62%", top: "10%", color: "#34d399", rotate: "38deg", delay: "1000ms", w: 5, h: 9, shape: "999px" },
  { left: "74%", top: "8%", color: "#fb7185", rotate: "-42deg", delay: "1040ms", w: 6, h: 10, shape: "2px" },
  { left: "86%", top: "15%", color: "#facc15", rotate: "18deg", delay: "1080ms", w: 5, h: 5, shape: "999px" },
  { left: "12%", top: "25%", color: "#fb923c", rotate: "72deg", delay: "1120ms", w: 4, h: 11, shape: "1px" },
  { left: "22%", top: "30%", color: "#34d399", rotate: "32deg", delay: "1160ms", w: 5, h: 7, shape: "999px" },
  { left: "76%", top: "28%", color: "#38bdf8", rotate: "-58deg", delay: "1200ms", w: 4, h: 10, shape: "2px" },
  { left: "88%", top: "34%", color: "#a78bfa", rotate: "54deg", delay: "1240ms", w: 5, h: 9, shape: "2px" },
  { left: "7%", top: "42%", color: "#facc15", rotate: "-22deg", delay: "1280ms", w: 6, h: 6, shape: "999px" },
  { left: "17%", top: "52%", color: "#f43f5e", rotate: "46deg", delay: "1320ms", w: 4, h: 10, shape: "1px" },
  { left: "84%", top: "47%", color: "#fb923c", rotate: "-64deg", delay: "1360ms", w: 5, h: 12, shape: "2px" },
  { left: "92%", top: "56%", color: "#34d399", rotate: "24deg", delay: "1400ms", w: 5, h: 5, shape: "999px" },
  { left: "11%", top: "66%", color: "#38bdf8", rotate: "-48deg", delay: "1440ms", w: 5, h: 9, shape: "2px" },
  { left: "20%", top: "75%", color: "#f59e0b", rotate: "74deg", delay: "1480ms", w: 4, h: 11, shape: "1px" },
  { left: "31%", top: "83%", color: "#fb7185", rotate: "-28deg", delay: "1520ms", w: 6, h: 6, shape: "999px" },
  { left: "69%", top: "81%", color: "#a78bfa", rotate: "42deg", delay: "1560ms", w: 5, h: 10, shape: "2px" },
  { left: "80%", top: "73%", color: "#f43f5e", rotate: "-54deg", delay: "1600ms", w: 5, h: 8, shape: "1px" },
  { left: "90%", top: "66%", color: "#facc15", rotate: "18deg", delay: "1640ms", w: 6, h: 6, shape: "999px" },
  { left: "44%", top: "18%", color: "#fb923c", rotate: "-70deg", delay: "1680ms", w: 4, h: 9, shape: "2px" },
  { left: "56%", top: "18%", color: "#38bdf8", rotate: "62deg", delay: "1720ms", w: 5, h: 9, shape: "2px" },
  { left: "29%", top: "39%", color: "#34d399", rotate: "-12deg", delay: "1760ms", w: 5, h: 5, shape: "999px" },
  { left: "71%", top: "40%", color: "#f59e0b", rotate: "28deg", delay: "1800ms", w: 4, h: 10, shape: "1px" },
  { left: "26%", top: "58%", color: "#a78bfa", rotate: "-38deg", delay: "1840ms", w: 6, h: 6, shape: "999px" },
  { left: "74%", top: "58%", color: "#fb7185", rotate: "58deg", delay: "1880ms", w: 4, h: 11, shape: "2px" },
  { left: "39%", top: "73%", color: "#facc15", rotate: "-18deg", delay: "1920ms", w: 5, h: 8, shape: "999px" },
  { left: "61%", top: "74%", color: "#34d399", rotate: "34deg", delay: "1960ms", w: 5, h: 9, shape: "1px" },
  { left: "51%", top: "84%", color: "#38bdf8", rotate: "-46deg", delay: "2000ms", w: 4, h: 10, shape: "2px" },
] as const;

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

interface BirthdayCelebrationModalProps {
  open: boolean;
  birthdays: HubBirthday[];
  onOpenChange: (open: boolean) => void;
}

export default function BirthdayCelebrationModal({
  open,
  birthdays,
  onOpenChange,
}: BirthdayCelebrationModalProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!open || birthdays.length === 0) return null;

  const hasMultipleBirthdays = birthdays.length > 1;

  return (
    <div
      data-birthday-modal
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/60 px-4 backdrop-blur-[2px] motion-safe:animate-[birthday-overlay-in_180ms_ease-out_both] [padding-bottom:calc(env(safe-area-inset-bottom)+1rem)] [padding-top:calc(env(safe-area-inset-top)+1rem)]"
      role="dialog"
      aria-modal="true"
      aria-label="Birthday celebration"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onOpenChange(false);
        }
      }}
    >
      <style>
        {`
          @keyframes birthday-overlay-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes birthday-card-rise {
            0% { opacity: 0; transform: translateY(7rem) scale(0.95); }
            66% { opacity: 1; transform: translateY(-0.45rem) scale(1.01); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }

          @keyframes birthday-firework-left {
            0% { opacity: 0; transform: translate3d(-6rem, 7.5rem, 0) scale(0.55) rotate(-10deg); }
            18% { opacity: 1; }
            58% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(8deg); }
            100% { opacity: 0; transform: translate3d(0.6rem, -0.7rem, 0) scale(0.92) rotate(12deg); }
          }

          @keyframes birthday-firework-right {
            0% { opacity: 0; transform: translate3d(6rem, 7.5rem, 0) scale(0.55) rotate(10deg); }
            18% { opacity: 1; }
            58% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(-8deg); }
            100% { opacity: 0; transform: translate3d(-0.6rem, -0.7rem, 0) scale(0.92) rotate(-12deg); }
          }

          @keyframes birthday-spark {
            0% { opacity: 0; transform: translate3d(0, 0, 0) rotate(var(--spark-rotate)) scale(0.25); }
            38% { opacity: 1; }
            100% {
              opacity: 0;
              transform:
                translate3d(
                  calc(var(--spark-x) * 1px),
                  calc(var(--spark-y) * 1px),
                  0
                )
                rotate(calc(var(--spark-rotate) + 95deg))
                scale(1);
            }
          }

          @keyframes birthday-streak {
            0% { opacity: 0; transform: translate3d(0, 0, 0) rotate(var(--spark-rotate)) scaleX(0.35); }
            30% { opacity: 0.95; }
            100% {
              opacity: 0;
              transform:
                translate3d(
                  calc(var(--spark-x) * 0.72px),
                  calc(var(--spark-y) * 0.72px),
                  0
                )
                rotate(var(--spark-rotate))
                scaleX(1);
            }
          }

          @keyframes birthday-card-confetti {
            0% { opacity: 0; transform: translate3d(0, -0.65rem, 0) rotate(var(--confetti-rotate)) scale(0.55); }
            28% { opacity: 1; }
            72% { opacity: 1; }
            100% { opacity: 0.88; transform: translate3d(var(--confetti-drift), 0.85rem, 0) rotate(calc(var(--confetti-rotate) + 55deg)) scale(1); }
          }

          @media (prefers-reduced-motion: reduce) {
            [data-birthday-modal] *,
            [data-birthday-modal] {
              animation-duration: 1ms !important;
              animation-iteration-count: 1 !important;
              scroll-behavior: auto !important;
            }
          }
        `}
      </style>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mx-auto w-full max-w-md"
      >
        {FIREWORK_BURSTS.map((burst, burstIndex) => (
          <div
            key={`${burst.side}-${burst.x}-${burst.y}`}
            className={`absolute h-24 w-24 ${
              burst.side === "left"
                ? "motion-safe:animate-[birthday-firework-left_1200ms_ease-out_both]"
                : "motion-safe:animate-[birthday-firework-right_1200ms_ease-out_both]"
            }`}
            style={{
              left: burst.x,
              top: burst.y,
              animationDelay: `${burst.delay}ms`,
            }}
          >
            {FIREWORK_PARTICLES.map((particle) => {
              const angle =
                ((particle + burstIndex * 0.75) / FIREWORK_PARTICLES.length) *
                Math.PI *
                2;
              const distance = burst.distance + (particle % 4) * 8;
              const isStreak = particle % 4 === 0;

              return (
                <span
                  key={`${burst.side}-${burstIndex}-${particle}`}
                  className={`absolute left-1/2 top-1/2 shadow-sm ${
                    isStreak
                      ? "h-0.5 w-7 rounded-full motion-safe:animate-[birthday-streak_840ms_ease-out_both]"
                      : particle % 3 === 0
                        ? "h-2 w-2 rounded-full motion-safe:animate-[birthday-spark_840ms_ease-out_both]"
                        : "h-2.5 w-1 rounded-sm motion-safe:animate-[birthday-spark_840ms_ease-out_both]"
                  }`}
                  style={{
                    animationDelay: `${burst.delay + 260 + particle * 24}ms`,
                    backgroundColor:
                      FIREWORK_COLORS[
                        (particle + burstIndex) % FIREWORK_COLORS.length
                      ],
                    "--spark-rotate": `${Math.round((angle * 180) / Math.PI)}deg`,
                    "--spark-x": `${Math.cos(angle) * distance}`,
                    "--spark-y": `${Math.sin(angle) * distance}`,
                  } as CSSProperties}
                />
              );
            })}
          </div>
        ))}
      </div>

      <section
        data-birthday-celebration
        className="relative flex h-[min(34rem,calc(100svh-2rem))] w-[calc(100%-2rem)] max-w-[22rem] flex-col overflow-hidden rounded-2xl border border-white/80 bg-[#fffdf9] shadow-2xl motion-safe:animate-[birthday-card-rise_620ms_660ms_cubic-bezier(0.2,0.85,0.25,1)_both]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-rose-100"
          style={{
            clipPath:
              "polygon(0 32%, 16% 24%, 33% 35%, 50% 22%, 68% 33%, 84% 24%, 100% 34%, 100% 100%, 0 100%)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[1]"
        >
          {CARD_CONFETTI.map((confetti, index) => (
            <span
              key={`${confetti.left}-${confetti.top}-${index}`}
              className="absolute opacity-0 shadow-sm motion-safe:animate-[birthday-card-confetti_860ms_ease-out_both]"
              style={{
                left: confetti.left,
                top: confetti.top,
                width: `${confetti.w}px`,
                height: `${confetti.h}px`,
                borderRadius: confetti.shape,
                backgroundColor: confetti.color,
                animationDelay: confetti.delay,
                "--confetti-rotate": confetti.rotate,
                "--confetti-drift": `${index % 2 === 0 ? "-" : ""}${4 + (index % 4) * 2}px`,
              } as CSSProperties}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close birthday celebration"
          className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div
          ref={scrollRef}
          className="relative z-10 flex flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            const element = event.currentTarget;
            const nextIndex = Math.round(
              element.scrollLeft / Math.max(element.clientWidth, 1),
            );
            setActiveIndex(
              Math.min(Math.max(nextIndex, 0), birthdays.length - 1),
            );
          }}
        >
          {birthdays.map((birthday) => (
            <article
              key={birthday.id}
              className="flex min-w-full snap-center flex-col items-center px-6 pb-4 pt-8 text-center"
            >
              <div className="relative mb-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                  <Cake className="h-7 w-7" />
                </span>
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-600 shadow-sm">
                  <Crown className="h-3.5 w-3.5" />
                </span>
              </div>

              <h2 className="max-w-[14rem] text-3xl font-extrabold leading-[1.05] text-primary">
                Happy Birthday!
              </h2>

              <Avatar className="mt-7 h-28 w-28 border-4 border-white shadow-lg">
                {birthday.photo_url && (
                  <AvatarImage src={birthday.photo_url} alt="" />
                )}
                <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                  {initialsOf(birthday.name)}
                </AvatarFallback>
              </Avatar>

              <p className="mt-5 max-w-full text-xl font-extrabold leading-tight text-foreground">
                {birthday.name}
              </p>

              {birthday.unit && (
                <p className="mt-1 max-w-full text-xs font-semibold text-muted-foreground">
                  {birthday.unit}
                </p>
              )}

              <p className="mt-5 max-w-[16rem] text-sm font-medium leading-6 text-muted-foreground">
                Wishing you a wonderful birthday filled with happiness and joy!
              </p>
            </article>
          ))}
        </div>

        {hasMultipleBirthdays && (
          <div
            className="relative z-10 flex items-center justify-center gap-1.5 px-4 pb-5 pt-1"
            aria-label="Birthday celebration pages"
          >
            {birthdays.map((birthday, index) => (
              <button
                key={birthday.id}
                type="button"
                aria-label={`Show birthday ${index + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  activeIndex === index
                    ? "w-5 bg-primary"
                    : "w-1.5 bg-muted-foreground/35"
                }`}
                onClick={() => {
                  const element = scrollRef.current;
                  if (!element) return;
                  element.scrollTo({
                    left: element.clientWidth * index,
                    behavior: "smooth",
                  });
                  setActiveIndex(index);
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
