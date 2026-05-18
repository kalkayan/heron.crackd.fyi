import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const PRODUCT_PREVIEW_SRC = "/landing-preview.png";

const HERO_PARTICLES = Array.from({ length: 90 }, (_, index) => ({
  id: index,
  left: `${(index * 11) % 100}%`,
  top: `${(index * 17) % 100}%`,
  size: 2 + (index % 3),
  delay: `${(index % 9) * 0.45}s`,
  duration: `${8 + (index % 7)}s`,
  opacity: 0.22 + (index % 5) * 0.08,
}));

const ORBIT_COMPANIES = [
  { name: "Stripe", top: "14%", left: "18%", depth: 0.18 },
  { name: "Google", top: "22%", left: "78%", depth: -0.22 },
  { name: "Bloomberg", top: "10%", left: "33%", depth: 0.12 },
];

const FEATURE_CARDS = [
  {
    title: "See the company brief",
    body: "Topic mix, loop shape, difficulty spread. Before prep starts.",
  },
  {
    title: "Start with one real move",
    body: "Not a bloated roadmap. Just the next topic that matters.",
  },
  {
    title: "Let the plan adapt",
    body: "Performance changes what unlocks next. Weak spots get pulled forward.",
  },
];

const COMPANY_ROWS = [
  { company: "Stripe", signal: "hash maps, API design, state tracking", difficulty: "medium-heavy" },
  { company: "Google", signal: "graphs, DFS/BFS, harder algorithmic spread", difficulty: "harder loop" },
  { company: "Meta", signal: "arrays, graphs, implementation speed", difficulty: "fast medium" },
  { company: "Amazon", signal: "leadership signals, trees, design", difficulty: "broad spread" },
];

function Logo() {
  return (
    <span className="inline-flex items-center ml-1 font-heading text-[1rem] font-extrabold tracking-[-0.05em] text-[#1A1A1A]">
      crackd
    </span>
  );
}

function Arrow({ size = 16, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3 8H13M13 8L8.5 3.5M13 8L8.5 12.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrbitChip({ name, top, left, depth }) {
  return (
    <div
      className="landing-orbit-chip absolute"
      style={{
        top,
        left,
        "--depth": depth,
      }}
    >
      {name}
    </div>
  );
}

function SectionTitle({ eyebrow, title, body, align = "left" }) {
  return (
    <div className={align === "center" ? "mx-auto max-w-[900px] text-center" : "max-w-[720px]"}>
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9A9A98]">{eyebrow}</p>
      <h2 className="mt-4 font-heading text-[40px] font-extrabold leading-[0.98] tracking-[-0.045em] text-[#1A1A1A] md:text-[56px]">
        {title}
      </h2>
      {body ? (
        <p className="mt-5 max-w-[560px] text-[16px] leading-[1.65] text-[#6B6B6B]">
          {body}
        </p>
      ) : null}
    </div>
  );
}

export function HomePage() {
  const pageRef = useRef(null);
  const [previewMissing, setPreviewMissing] = useState(false);

  useEffect(() => {
    const node = pageRef.current;
    if (!node) return;

    let rafId = 0;

    const updatePointer = (event) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        node.style.setProperty("--pointer-x", `${x}%`);
        node.style.setProperty("--pointer-y", `${y}%`);
        node.style.setProperty("--pointer-tilt-x", `${(x - 50) / 18}deg`);
        node.style.setProperty("--pointer-tilt-y", `${(50 - y) / 18}deg`);
      });
    };

    const resetPointer = () => {
      node.style.setProperty("--pointer-x", "50%");
      node.style.setProperty("--pointer-y", "20%");
      node.style.setProperty("--pointer-tilt-x", "0deg");
      node.style.setProperty("--pointer-tilt-y", "0deg");
    };

    node.addEventListener("mousemove", updatePointer);
    node.addEventListener("mouseleave", resetPointer);
    resetPointer();

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      node.removeEventListener("mousemove", updatePointer);
      node.removeEventListener("mouseleave", resetPointer);
    };
  }, []);

  return (
    <div ref={pageRef} className="landing-page min-h-screen overflow-x-hidden bg-[#F7F5F0] text-[#1A1A1A]">
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto mt-4 flex max-w-[1380px] items-center justify-between rounded-full border border-white/70 bg-white/80 px-5 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl md:px-6">
          <Link to="/" className="flex items-center">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-8 text-[13px] font-medium text-[#5F5F5B] md:flex">
            <a href="#flow" className="transition-colors hover:text-[#1A1A1A]">How it works</a>
            <a href="#signals" className="transition-colors hover:text-[#1A1A1A]">Signals</a>
            <a href="#pricing" className="transition-colors hover:text-[#1A1A1A]">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-[13px] font-semibold text-white! shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
            >
              Start your plan <Arrow size={12} color="#FFFFFF" />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="landing-hero relative min-h-[90vh] px-6 pb-4 pt-24 md:px-10 md:pb-8 md:pt-32">
          <div className="landing-hero-glow absolute inset-0" />
          <div className="landing-hero-noise absolute inset-0 opacity-70" />

          <div className="pointer-events-none absolute inset-0">
            {HERO_PARTICLES.map((particle) => (
              <span
                key={particle.id}
                className="landing-particle absolute rounded-full bg-[#425EFF]"
                style={{
                  left: particle.left,
                  top: particle.top,
                  width: particle.size,
                  height: particle.size,
                  opacity: particle.opacity,
                  animationDelay: particle.delay,
                  animationDuration: particle.duration,
                }}
              />
            ))}

            {ORBIT_COMPANIES.map((company) => (
              <OrbitChip key={company.name} {...company} />
            ))}
          </div>

          <div className="relative mx-auto flex min-h-[60vh] max-w-[1380px] flex-col justify-center">
            <div className="mx-auto max-w-[980px] text-center">
              <p className="inline-flex items-center mt-20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] backdrop-blur">
                Company-specific. Sequenced. Built around where you actually stand.
              </p>
              <h1 className="font-heading text-[6rem]! font-extrabold leading-[0.92] tracking-[-0.06em] text-[#111111] md:mt-10 md:text-[78px]">
                Experience a better shot at the offer.
              </h1>

              <div className="mt-8 flex flex-col items-center gap-4 md:mt-10">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-7 py-4 text-[15px] font-semibold text-white! shadow-[0_14px_34px_rgba(0,0,0,0.14)] transition-transform hover:scale-[1.02]"
                >
                  Start your plan <Arrow size={16} color="#FFFFFF" />
                </Link>
                <a
                  href="#flow"
                  className="text-[14px] font-medium text-[#5F5F5B] underline-offset-4 transition-colors hover:text-[#1A1A1A] hover:underline"
                >
                  See how it works
                </a>
              </div>
            </div>

          </div>
        </section>

        <section className="relative px-6 pb-12 pt-2 md:px-10 md:pb-20 md:pt-4">
          <div className="mx-auto max-w-[1380px]">
            <div className="overflow-hidden rounded-[42px] bg-[#050505] px-4 pb-4 pt-10 shadow-[0_30px_90px_rgba(0,0,0,0.18)] md:px-8 md:pb-8 md:pt-14">
              <div className="pointer-events-none absolute inset-0 opacity-80">
                <div className="landing-footer-stars absolute inset-0" />
              </div>

              <div className="relative mx-auto max-w-[1120px]">
                <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Product Preview</p>
                    <h2 className="mt-3 mb-5 font-heading text-[34px] font-extrabold leading-[1] tracking-[-0.045em] text-white md:text-[48px]">
                      See the product before the pitch explains it.
                    </h2>
                  </div>
                  <p className="max-w-[320px] text-[14px] leading-[1.6] text-white/60">
                    Replace this with a real screenshot whenever you're ready.
                  </p>
                </div>

                <div className="rounded-[30px] border border-white/10 bg-[#F8F5EE] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.24)] md:p-4">
                  <div className="overflow-hidden rounded-[24px] border border-[#E9E3D7] bg-white">
                    {!previewMissing ? (
                      <img
                        src={PRODUCT_PREVIEW_SRC}
                        alt="crackd product preview"
                        className="block h-auto w-full"
                        onError={() => setPreviewMissing(true)}
                      />
                    ) : (
                      <div className="flex min-h-[540px] flex-col items-center justify-center px-8 py-16 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9A9A98]">Missing Preview Image</p>
                        <h3 className="mt-4 font-heading text-[34px] font-extrabold leading-[1.02] tracking-[-0.04em] text-[#111111]">
                          Drop your screenshot here
                        </h3>
                        <p className="mt-4 max-w-[560px] text-[15px] leading-[1.7] text-[#5F5F5B]">
                          Add your product screenshot at <span className="font-semibold text-[#111111]">public/landing-preview.png</span>.
                          The landing page will pick it up automatically.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative px-6 py-18 md:px-10 md:py-24">
          <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-10">
              <SectionTitle
                eyebrow="What is it"
                title="A prep path shaped like the company you want."
                body="crackd is a company-specific interview strategy engine for engineers who do not need more prep content.
                They need a sharper path to the offer."
              />
            </div>
          </div>
        </section>

        <section className="relative px-6 pb-16 pt-6 md:px-10 md:pb-24 md:pt-10">
          <div className="mx-auto max-w-[1380px]">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="landing-surface rounded-[36px] border border-white/70 bg-white/55 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.06)] backdrop-blur-xl md:p-7">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9A9A98]">Company Reveal</p>
                  <h3 className="mt-4 font-heading text-[34px] font-extrabold leading-[1.02] tracking-[-0.045em] text-[#111111]">
                    First, we show you the mountain.
                  </h3>
                  <p className="mt-4 max-w-[420px] text-[15px] leading-[1.65] text-[#5F5F5B]">
                    The topic mix. The loop shape. The difficulty bar. The patterns that keep showing up.
                    Before any plan exists, the target becomes concrete.
                  </p>
                  <div className="mt-8 rounded-[28px] border border-[#ECE8DE] bg-[#FCFBF8] p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9A9A98]">Bloomberg</span>
                      <span className="rounded-full bg-[#FBF1ED] px-2.5 py-1 text-[10px] font-bold text-[#C25C3D]">
                        18 reports
                      </span>
                    </div>
                    <p className="mt-4 text-[18px] font-black tracking-[-0.03em] text-[#111111]">
                      Arrays, design, graphs, system design
                    </p>
                    <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#EEE8DB]">
                      <div className="h-full w-[24%] bg-[#B53A33]" />
                      <div className="h-full w-[58%] bg-[#B77A2D]" />
                      <div className="h-full w-[18%] bg-[#3A8552]" />
                    </div>
                    <div className="mt-4 flex gap-2 text-[11px] font-medium text-[#6A6A66]">
                      <span>hard 24%</span>
                      <span>medium 58%</span>
                      <span>easy 18%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7">
                <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="landing-surface rounded-[36px] border border-white/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.74),rgba(255,249,240,0.72))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.05)] backdrop-blur-xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9A9A98]">Not This</p>
                    <p className="mt-8 text-[34px] font-black leading-[1.02] tracking-[-0.05em] text-[#A5A29A] line-through decoration-[#D7D1C5]">
                      500 questions and a vague hope.
                    </p>
                  </div>

                  <div className="landing-surface rounded-[36px] border border-white/70 bg-[#111111] p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">This</p>
                    <p className="mt-8 text-[34px] font-black leading-[1.02] tracking-[-0.05em]">
                      A prep path shaped like the company you want.
                    </p>
                  </div>

                  <div className="landing-surface rounded-[36px] border border-white/70 bg-white/70 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.05)] backdrop-blur-xl md:col-span-2">
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.2fr_0.8fr]">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#9A9A98]">What You Are Buying</p>
                        <p className="mt-5 max-w-[560px] text-[32px] font-black leading-[1.03] tracking-[-0.045em] text-[#111111]">
                          Not more content. Better sequencing, better calibration, better timing.
                        </p>
                      </div>
                      <div className="flex flex-col justify-end gap-3 text-[13px] leading-[1.6] text-[#5F5F5B]">
                        <p>Pick the company.</p>
                        <p>Pick the timeline.</p>
                        <p>Let performance decide what comes next.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="flow" className="relative px-6 py-28 md:px-10 md:py-36">
          <div className="mx-auto max-w-[1380px]">
            <SectionTitle
              eyebrow="How It Works"
              title="A sparse flow, not a bloated curriculum."
              body="The product should feel like motion. One target. One next move. One clearer signal every time you finish a topic."
            />

            <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-12">
              <div className="lg:col-span-4">
                {FEATURE_CARDS.map((card, index) => (
                  <div
                    key={card.title}
                    className="landing-flow-card mb-5 rounded-[30px] border border-[#EAE5DA] bg-white px-6 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.05)] last:mb-0"
                    style={{ "--card-index": index }}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D97757]">
                      0{index + 1}
                    </p>
                    <h3 className="mt-4 font-heading text-[28px] font-extrabold leading-[1.02] tracking-[-0.04em] text-[#111111]">
                      {card.title}
                    </h3>
                    <p className="mt-4 max-w-[280px] text-[14px] leading-[1.65] text-[#5F5F5B]">
                      {card.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-8">
                <div className="landing-mission-panel rounded-[42px] border border-[#ECE8DE] bg-[linear-gradient(180deg,#FFFCF6_0%,#F7F5F0_100%)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.06)] md:p-8">
                  <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.92fr]">
                    <div className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_16px_32px_rgba(0,0,0,0.04)]">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9A9A98]">Today</p>
                          <p className="mt-2 text-[18px] font-black tracking-[-0.03em] text-[#111111]">What your prep looks like</p>
                        </div>
                        <span className="rounded-full border border-[#EEE8DB] px-3 py-1 text-[11px] font-medium text-[#6A6A66]">
                          4 weeks
                        </span>
                      </div>

                      <div className="mt-6 space-y-4">
                        <div className="rounded-[20px] border border-[#F0ECE3] bg-[#FCFBF8] px-4 py-4">
                          <div className="flex items-center justify-between">
                            <p className="text-[15px] font-black tracking-[-0.02em] text-[#111111]">hash map lookup</p>
                            <span className="text-[11px] font-bold text-[#D97757]">now</span>
                          </div>
                          <p className="mt-2 text-[13px] text-[#6A6A66]">Foundational. Company asks this often.</p>
                        </div>
                        <div className="rounded-[20px] border border-[#F0ECE3] bg-[#FCFBF8] px-4 py-4 opacity-70">
                          <p className="text-[15px] font-black tracking-[-0.02em] text-[#111111]">array traversal</p>
                          <p className="mt-2 text-[13px] text-[#6A6A66]">Unlocks next if current topic is solid.</p>
                        </div>
                        <div className="rounded-[20px] border border-[#F0ECE3] bg-[#FCFBF8] px-4 py-4 opacity-55">
                          <p className="text-[15px] font-black tracking-[-0.02em] text-[#111111]">frequency counting</p>
                          <p className="mt-2 text-[13px] text-[#6A6A66]">Comes forward if you struggle.</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,242,235,0.88))] p-6 shadow-[0_16px_32px_rgba(0,0,0,0.04)]">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9A9A98]">Why This Converts</p>
                      <p className="mt-5 text-[30px] font-black leading-[1.04] tracking-[-0.045em] text-[#111111]">
                        Engineers do not need more material.
                        <br />
                        They need a plan that feels expensive to ignore.
                      </p>
                      <div className="mt-8 space-y-4 text-[14px] leading-[1.65] text-[#5F5F5B]">
                        <p>LeetCode gives you content and leaves the strategy to you.</p>
                        <p>crackd makes the company visible, then turns your limited time into ordered prep.</p>
                        <p>The pitch is not "learn DSA." The pitch is "get yourself ready for Stripe, Google, Meta, or Bloomberg without wasting the next month."</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="signals" className="relative px-6 py-28 md:px-10 md:py-36">
          <div className="mx-auto grid max-w-[1380px] grid-cols-1 gap-14 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionTitle
                eyebrow="Company Signals"
                title="Each company has its own interview shape."
                body="That is the point. The page should make the asset feel tangible before the user ever starts the product."
              />
            </div>

            <div className="lg:col-span-7">
              <div className="space-y-4">
                {COMPANY_ROWS.map((row, index) => (
                  <div
                    key={row.company}
                    className="landing-company-row rounded-[30px] border border-[#EAE5DA] bg-white/85 px-6 py-5 shadow-[0_20px_40px_rgba(0,0,0,0.04)] backdrop-blur"
                    style={{ "--row-index": index }}
                  >
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[170px_1fr_140px] md:items-center">
                      <p className="text-[22px] font-black tracking-[-0.03em] text-[#111111]">{row.company}</p>
                      <p className="text-[14px] leading-[1.6] text-[#5F5F5B]">{row.signal}</p>
                      <div className="justify-self-start rounded-full bg-[#F4F1EA] px-3 py-1.5 text-[11px] font-medium text-[#6A6A66] md:justify-self-end">
                        {row.difficulty}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative px-6 py-10 md:px-10 md:py-14">
          <div className="mx-auto max-w-[1380px]">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-[26px] border border-[#EAE5DA] bg-[#111111] px-5 py-5 text-white shadow-[0_18px_36px_rgba(0,0,0,0.1)]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Not For</p>
                <p className="mt-4 text-[18px] font-black leading-[1.1] tracking-[-0.03em]">
                  Beginners starting their DSA journey.
                </p>
              </div>
              <div className="rounded-[26px] border border-[#EAE5DA] bg-white px-5 py-5 shadow-[0_18px_36px_rgba(0,0,0,0.04)]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9A9A98]">For</p>
                <p className="mt-4 text-[18px] font-black leading-[1.1] tracking-[-0.03em] text-[#111111]">
                  Mid-level to senior engineers with money, not time.
                </p>
              </div>
              <div className="rounded-[26px] border border-[#EAE5DA] bg-[linear-gradient(145deg,#FFF7EA,#F8F2E8)] px-5 py-5 shadow-[0_18px_36px_rgba(0,0,0,0.04)]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9A9A98]">Price</p>
                <p className="mt-4 text-[18px] font-black leading-[1.1] tracking-[-0.03em] text-[#111111]">
                  $9/month. 7-day trial. Card required.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="px-6 pb-20 pt-12 md:px-10 md:pb-28">
          <div className="mx-auto max-w-[1380px]">
            <div className="landing-footer-cta overflow-hidden rounded-[42px] bg-[#050505] px-8 py-12 text-white shadow-[0_30px_80px_rgba(0,0,0,0.18)] md:px-12 md:py-16">
              <div className="landing-footer-stars absolute inset-0 opacity-90" />
              <div className="relative grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
                <div className="lg:col-span-8">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Ready</p>
                  <h2 className="mt-4 max-w-[820px] font-heading text-[42px] font-extrabold leading-[0.98] tracking-[-0.05em] text-white md:text-[66px]">
                    You are not buying prep.
                    <br />
                    You are buying a better month.
                  </h2>
                  <p className="mt-5 max-w-[560px] text-[16px] leading-[1.7] text-white/70">
                    Pick the company. Pick the timeline. See the mountain, then start the climb with a plan that reacts to reality.
                  </p>
                </div>

                <div className="relative lg:col-span-4">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 text-[15px] font-semibold text-[#111111] shadow-[0_16px_30px_rgba(255,255,255,0.14)] transition-transform hover:scale-[1.02]"
                  >
                    Start your plan <Arrow size={16} color="#111111" />
                  </Link>
                </div>
              </div>
            </div>

            <footer className="mt-12 grid grid-cols-1 gap-8 border-t border-[#E6E0D4] pt-8 md:grid-cols-[1fr_220px_220px]">
              <div>
                <p className="text-[10rem]! font-heading font-extrabold tracking-[-0.05em] text-[#111111] md:text-[64px]">
                  crackd
                </p>
              </div>
              <div className="space-y-3 text-[14px] text-[#5F5F5B]">
                <p>Product</p>
                <p>Companies</p>
                <p>Pricing</p>
              </div>
              <div className="space-y-3 text-[14px] text-[#5F5F5B]">
                <p>Built around the company.</p>
                <p>Built around you.</p>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
