# Heron — UI Design System

This document captures the design language established across CompanyPage and should be applied consistently to every page in heron.

---

## Palette

| Token | Hex | Use |
|---|---|---|
| Background | `#F4F1EA` | Page bg (warm cream with dot grid) |
| Card bg | `#FFFFFF` | Widget surface |
| Card border | `#E5E2D8` | All card borders |
| Text primary | `#1A1A1A` | Headings, strong labels |
| Text secondary | `#6B6B6B` | Body copy, descriptions |
| Text muted | `#9A9A98` | Labels, eyebrows |
| Text faint | `#B0ADA4` | Footnotes, dates |
| Orange accent | `#D97757` | CTAs, n= counts, highlight values |
| Orange hover | `#E0886A` | Button hover state |
| Green offer | `#1A7A48` | Offer outcomes, positive signal |
| Red risk | `#A82828` | Rejection, hard difficulty, danger |
| Amber mid | `#A86B1A` | Medium difficulty, caution |
| Dot grid | `#D8D6CE` | Background pattern dots |

---

## Layout

### Page shell
```jsx
<div className="min-h-screen bg-[#F4F1EA] bg-[radial-gradient(circle,_#D8D6CE_1px,_transparent_1px)] bg-[size:16px_16px]">
  <AppNav />
  <main className="max-w-[1240px] mx-auto px-10 pb-32 pt-12">
    {/* sections */}
  </main>
</div>
```

### Section wrapper
```jsx
function Section({ title, subheading, children }) {
  return (
    <section className="mt-20">
      <div className="mb-10">
        <h2 className="font-heading text-2xl font-extrabold tracking-tight text-[#1A1A1A]">{title}</h2>
        {subheading && <p className="text-[15px] text-[#6B6B6B] mt-1 font-medium">{subheading}</p>}
      </div>
      {children}
    </section>
  );
}
```

### Grid conventions
- **2 equal cols**: `grid grid-cols-2 gap-8`
- **1/3 + 2/3**: `grid grid-cols-3 gap-8` with `col-span-1` / `col-span-2`
- **12-col fine control**: `grid grid-cols-12 gap-8` with explicit `col-span-N`
- **Hero layout**: `grid grid-cols-12 gap-10` — content 7 cols, sidebar 5 cols

---

## Cards / Widgets

Every discrete data panel is a card. Use `CARD_CLASS` constant:

```js
const CARD_CLASS = "bg-white border border-[#E5E2D8] rounded-[24px] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.02)]";
```

Rules:
- Never put multiple independent data stories in one card — split them
- Cards sit directly in the section grid (no wrapper divs)
- Use `border-t border-[#F4F1EA]` to divide sub-sections within one card
- Footnotes inside cards: `text-[10px] text-[#B0ADA4] leading-relaxed mt-4 italic`

---

## Typography

| Role | Classes |
|---|---|
| Section heading | `font-heading text-2xl font-extrabold tracking-tight text-[#1A1A1A]` |
| Card eyebrow | `text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em]` |
| Card value (large) | `text-[24px] font-black text-[#1A1A1A] tabular-nums leading-none` |
| Card value (medium) | `text-[15px] font-black text-[#1A1A1A] tracking-tight` |
| Body copy | `text-[13px] text-[#6B6B6B] leading-relaxed` |
| Footnote | `text-[10px] text-[#B0ADA4] leading-relaxed` |
| n= count | `text-[#D97757] font-bold` (always orange, inline) |

Fonts: `font-sans` = Inter, `font-heading` = Martel Sans (headings only).

---

## Data Visualisation Choices

### Don't use bars for everything
Bars create visual fatigue when repeated 10+ times. Use alternative representations:

| Data type | Preferred visual |
|---|---|
| Topic/category distribution | Chip strip or squarified treemap |
| Trending items | Green arrow chips (`↑ topic`) |
| Recurring patterns | Tag pills with orange `×count` |
| Style/difficulty breakdown | Single stacked horizontal bar + dot legend |
| Elimination/drop-off by round | Orange fill bars (one context, not repeated everywhere) |
| Portfolio/hotspot map | Squarified treemap with opacity/colour scaling |

### Stacked horizontal bar
```jsx
<div className="flex w-full rounded-xl overflow-hidden h-[52px] bg-[#FAF6EE]">
  {segments.filter(d => d.pct > 0).map(d => (
    <div key={d.key} style={{ flexGrow: d.pct, background: d.color, minWidth: 4 }}
      className="flex items-center justify-center text-white">
      {d.pct >= 14 && <span className="font-black text-[15px]">{d.pct}%</span>}
    </div>
  ))}
</div>
```

### Squarified treemap
Use the `squarifyTreemap(items, width, height)` helper (defined in CompanyPage). Items need a `weight` field. Returns `{x, y, w, h}` in [0, 100] coordinates. Render with `position: absolute` inside a `relative` container.

Colour-by-rank pattern (not opacity-fade):
```js
const ranked = [...boxes].sort((a, b) => b.score - a.score);
const rankMap = Object.fromEntries(ranked.map((b, i) => [b.name, i]));
// rank 0–3: green fading, rank 4–6: olive, rank 7+: yellow
```

### Hover tooltips on treemap cells
Use CSS group-hover, not native `title` attribute (too slow):
```jsx
<div className="absolute ... group/cell cursor-default">
  {/* content */}
  <div className="absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 z-10 pointer-events-none opacity-0 group-hover/cell:opacity-100 transition-opacity duration-100 whitespace-nowrap">
    <div className="bg-[#1A1A1A] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg">
      {tooltipText}
    </div>
  </div>
</div>
```

---

## Chips & Pills

### Filter chips (interactive)
```jsx
function FilterChip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick}
      className="px-2.5 py-1 rounded-full text-[10px]! transition-colors"
      style={{
        background: active ? "#1A1A1A" : "transparent",
        color: active ? "#FFFFFF" : "#6B6B6B",
        border: `1px solid ${active ? "#1A1A1A" : "#E5E2D8"}`,
      }}>
      {children}
    </button>
  );
}
```

Toggle behaviour: clicking active chip deselects (shows all), clicking inactive selects it. Default = first item active.

### Pastel content chips
Rotate through this palette by index:
```js
const palette = [
  { bg: "#FBF1ED", border: "#F0D6C7", text: "#C25C3D" }, // coral
  { bg: "#EDFBF3", border: "#B6EDD0", text: "#1A7A48" }, // sage
  { bg: "#FFF8EB", border: "#F0D9A0", text: "#A86B1A" }, // amber
  { bg: "#F1EFE3", border: "#D8D2B8", text: "#6B5A3A" }, // warm tan
  { bg: "#EEF0FB", border: "#C7CFF0", text: "#3D4DC2" }, // indigo
];
```

### Trending chips
```jsx
<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-[#EDFBF3] border-[#B6EDD0] text-[#1A7A48]">
  <span className="text-[9px]">↑</span>{topic}
</span>
```

### Outcome/difficulty chips (inline metadata)
```js
const diffColors = { easy: ["#EDFBF3","#B6EDD0","#1A7A48"], hard: ["#FBF1ED","#F0C4C4","#A82828"], medium: ["#FFF8EB","#F0D9A0","#A86B1A"] };
const outcomeColors = { offer: ["#EDFBF3","#B6EDD0","#1A7A48"], rejected: ["#FBF1ED","#F0C4C4","#A82828"] };
// render: <span className="px-2 py-0.5 rounded text-[10px] font-bold border capitalize" style={{ background, borderColor, color }}>{label}</span>
```

---

## Buttons & CTAs

### Primary CTA (orange)
```jsx
<Link to={...} className="bg-[#D97757] hover:bg-[#E0886A] text-white! py-5 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]">
  Open my plan →
</Link>
```

**Always use `text-white!`** (with `!`) — the global `a { color: inherit }` will override `text-white` without it.

### Text link
```jsx
<Link className="text-[11px] font-bold text-[#D97757] hover:underline">View all N →</Link>
```

### Final page CTA banner
White card (`bg-white border border-[#E5E2D8] rounded-[32px]`), two-column layout: headline left, button right. Not black/dark — stays consistent with page warmth.

---

## Empty States

- Never show fabricated data. Hide a widget entirely if data is insufficient.
- Minimum thresholds: show a widget only when there are ≥2–3 data points (depends on context).
- Empty state text: concise italic muted copy, no icon needed.
  ```jsx
  <p className="text-xs text-[#9A9A98] italic">Not enough data yet.</p>
  ```

---

## Question Feed Pattern

- Hard cap: **2 questions per round type** (round-robin diversity, not raw top-N)
- Always show: round type chip, difficulty chip, outcome chip, topic tags, LC link if available
- Date pushed to far right (`ml-auto`) — secondary info
- Rows separated by `border-b border-[#EEECE6] last:border-b-0`
- Footer: `Showing N of M questions` in muted italic when capped
- Round filter chips above right; "View all N →" orange link top right

---

## Credibility Signals

- Always show `n=X` counts next to aggregated stats in orange `#D97757`
- Use `· n=X` dot-separated inline, never in parentheses as a separate element
- Data recency: show relative date labels (e.g. "last 6 mo") on trending data

---

## Animation

```css
@keyframes plan-step-in {
  0% { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

Use on newly appearing list items: `animation: plan-step-in 0.4s ease-out`.

Tailwind's `animate-spin` is available for loading spinners — don't define a duplicate `@keyframes spin`.
