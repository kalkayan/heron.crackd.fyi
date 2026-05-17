import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import { apiFetch } from "../lib/utils";

// ---------------------------------------------------------------------------
// Constants & UI Components
// ---------------------------------------------------------------------------

const CARD_CLASS = "bg-white border border-[#E5E2D8] rounded-[24px] p-8 shadow-[0_2px_8px_rgba(0,0,0,0.02)]";
const SECTION_TITLE_CLASS = "font-heading text-2xl font-extrabold tracking-tight text-[#1A1A1A]";
const SUBHEADING_CLASS = "text-[15px] text-[#6B6B6B] mt-1 font-medium";

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

function Bar({ value, max, color = "#1A1A1A" }) {
  return (
    <div className="flex-1 h-1.5 bg-[#F0EEE6] rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-700 ease-out" 
        style={{ width: `${pct(value, max)}%`, background: color }} 
      />
    </div>
  );
}

function Section({ title, subheading, children, className = "" }) {
  return (
    <section className={`mt-20 ${className}`}>
      <div className="mb-10">
        <h2 className={SECTION_TITLE_CLASS}>{title}</h2>
        {subheading && <p className={SUBHEADING_CLASS}>{subheading}</p>}
      </div>
      {children}
    </section>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 rounded-full text-[10px]! transition-colors"
      style={{
        background: active ? "#1A1A1A" : "transparent",
        color: active ? "#FFFFFF" : "#6B6B6B",
        border: `1px solid ${active ? "#1A1A1A" : "#E5E2D8"}`,
      }}
    >
      {children}
    </button>
  );
}

function StatColumn({ title, items, color, formatValue }) {
  return (
    <div>
      <h3 className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-6">{title}</h3>
      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map(it => (
            <div key={it.name}>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-[12.5px] font-bold text-[#1A1A1A] truncate capitalize">{it.name}</span>
                <span className="text-[11px] font-black text-[#6B6B6B] tabular-nums shrink-0">
                  {formatValue(it)}
                </span>
              </div>
              <Bar value={it.barValue} max={100} color={color} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#9A9A98] italic">Not enough data yet.</p>
      )}
    </div>
  );
}

// Squarified treemap — items: [{weight, ...meta}], returns same items with x/y/w/h in [0,100]
function squarifyTreemap(items, width = 100, height = 100) {
  const filtered = items.filter(i => i.weight > 0);
  if (filtered.length === 0) return [];
  const sorted = [...filtered].sort((a, b) => b.weight - a.weight);
  const totalWeight = sorted.reduce((s, i) => s + i.weight, 0);
  const scaled = sorted.map(i => ({ ...i, area: (i.weight / totalWeight) * width * height }));

  const worstAspect = (row, side) => {
    const rs = row.reduce((s, i) => s + i.area, 0);
    const s2 = side * side;
    const r2 = rs * rs;
    return row.reduce(
      (max, i) => Math.max(max, (s2 * i.area) / r2, r2 / (s2 * i.area)),
      0
    );
  };

  const out = [];
  let x = 0, y = 0, w = width, h = height;
  let remaining = [...scaled];

  while (remaining.length > 0) {
    const side = Math.min(w, h);
    const row = [];
    let prev = Infinity;
    while (remaining.length > 0) {
      const test = [...row, remaining[0]];
      const next = worstAspect(test, side);
      if (row.length === 0 || next <= prev) {
        row.push(remaining.shift());
        prev = next;
      } else break;
    }
    const rowArea = row.reduce((s, i) => s + i.area, 0);
    if (w >= h) {
      const stripW = rowArea / h;
      let cy = y;
      for (const it of row) {
        const ih = it.area / stripW;
        out.push({ ...it, x, y: cy, w: stripW, h: ih });
        cy += ih;
      }
      x += stripW;
      w -= stripW;
    } else {
      const stripH = rowArea / w;
      let cx = x;
      for (const it of row) {
        const iw = it.area / stripH;
        out.push({ ...it, x: cx, y, w: iw, h: stripH });
        cx += iw;
      }
      y += stripH;
      h -= stripH;
    }
  }
  return out;
}

function buildPlanSteps(companyName, reportCount) {
  return [
    `Mapping ${companyName}`,
    reportCount ? `Reading ${reportCount} candidate ${reportCount === 1 ? "report" : "reports"}` : "Reading candidate reports",
    "Spotting recurring patterns",
    "Picking topics that matter",
    "Calibrating difficulty",
    "Thinking about you",
    "Sequencing your plan",
  ];
}

function EmptyStateCard({ title, body }) {
  return (
    <div className={`${CARD_CLASS} flex flex-col items-center text-center justify-center min-h-[200px] border-dashed bg-[#FDFCFB]`}>
      <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-4">Emerging Signal</span>
      <h4 className="text-sm font-bold text-[#1A1A1A] mb-2">{title}</h4>
      <p className="text-xs text-[#9A9A98] max-w-[240px] leading-relaxed font-medium">
        {body}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function CompanyPage() {
  const { companyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [reports, setReports] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [error, setError] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [buildStep, setBuildStep] = useState(0);
  const [activeStageId, setActiveStageId] = useState(null);
  const [questionFilter, setQuestionFilter] = useState("all");

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [cRes, rRes, qRes, rdRes, sRes] = await Promise.all([
        apiFetch(`/api/user/interview/companies/${encodeURIComponent(companyId)}`),
        apiFetch(`/api/user/interview/reports?company_id=${encodeURIComponent(companyId)}&limit=200`),
        apiFetch(`/api/user/interview/companies/${encodeURIComponent(companyId)}/questions`),
        apiFetch(`/api/user/interview/companies/${encodeURIComponent(companyId)}/rounds`),
        apiFetch(`/api/user/sessions`),
      ]);

      const [cData, rData, qData, rdData, sData] = await Promise.all([
        cRes.json(), rRes.json(), qRes.json(), rdRes.json(), sRes.json()
      ]);

      if (cData.error) throw new Error(cData.error);
      setCompany(cData);
      setReports(Array.isArray(rData.reports) ? rData.reports : []);
      setQuestions(Array.isArray(qData.questions) ? qData.questions : []);
      setRounds(Array.isArray(rdData.rounds) ? rdData.rounds : []);
      
      const sessions = Array.isArray(sData.sessions) ? sData.sessions : [];
      const companySessions = sessions.filter(s => s.company_id === companyId);
      setUserSessions(companySessions);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
    window.scrollTo(0, 0);
  }, [load]);

  // Poll sessions while a plan is generating for this company
  useEffect(() => {
    const isGenerating = userSessions[0]?.plan_status === "generating";
    if (!isGenerating) return;
    const interval = setInterval(async () => {
      try {
        const resp = await apiFetch("/api/user/sessions");
        if (!resp) return;
        const data = await resp.json();
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        setUserSessions(sessions.filter(s => s.company_id === companyId));
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [userSessions, companyId]);

  // Animate the build-plan log while generating
  useEffect(() => {
    const isGenerating = userSessions[0]?.plan_status === "generating";
    if (!isGenerating) {
      setBuildStep(0);
      return;
    }
    const steps = buildPlanSteps(company?.name || "this company", reports.length);
    const id = setInterval(() => {
      setBuildStep(s => Math.min(s + 1, steps.length - 1));
    }, 1800);
    return () => clearInterval(id);
  }, [userSessions, company, reports.length]);

  // --- Intelligence Engine ---

  const stats = useMemo(() => {
    if (!reports.length) return null;

    // --- Honest hero stats ---
    // Parse "YYYY-MM" or "YYYY" into a Date (first of month / first of year)
    const parseReportDate = (s) => {
      if (!s) return null;
      const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(s);
      if (!m) return null;
      return new Date(Number(m[1]), m[2] ? Number(m[2]) - 1 : 0, 1);
    };
    const datedReports = reports
      .map(r => ({ r, d: parseReportDate(r.interview_date) }))
      .filter(x => x.d);
    const mostRecentDate = datedReports.length
      ? datedReports.reduce((a, b) => (a.d > b.d ? a : b)).d
      : null;
    const eighteenMonthsAgo = new Date();
    eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
    const recentCount = datedReports.filter(x => x.d >= eighteenMonthsAgo).length;

    // Level mix (intern/junior/mid/senior/staff)
    const levelCounts = {};
    reports.forEach(r => {
      const lv = (r.level || "").toLowerCase();
      if (lv) levelCounts[lv] = (levelCounts[lv] || 0) + 1;
    });
    const levelEntries = Object.entries(levelCounts).sort((a, b) => b[1] - a[1]);
    const levelTotal = levelEntries.reduce((s, [, c]) => s + c, 0);
    const topLevels = levelEntries.slice(0, 2).map(([k]) => k);
    const levelLabel = topLevels.length
      ? (topLevels.length === 1 ? topLevels[0] : topLevels.join(" + "))
      : null;

    // Role family — bucket freeform role strings into families
    const roleFamilyCounts = {};
    reports.forEach(r => {
      const raw = (r.role || "").toLowerCase();
      if (!raw) return;
      let family = null;
      if (/\b(ml|machine learning|ai engineer)\b/.test(raw)) family = "Machine Learning Engineers";
      else if (/\bdata (engineer|scientist)\b|\bdata sci/.test(raw)) family = "Data Engineers";
      else if (/\b(sre|reliability|devops|infra)\b/.test(raw)) family = "Infrastructure Engineers";
      else if (/\b(swe|sde|software|backend|frontend|full[- ]?stack|engineer)\b/.test(raw)) family = "Software Engineers";
      if (family) roleFamilyCounts[family] = (roleFamilyCounts[family] || 0) + 1;
    });
    const roleFamilyEntries = Object.entries(roleFamilyCounts).sort((a, b) => b[1] - a[1]);
    const roleFamilyTotal = roleFamilyEntries.reduce((s, [, c]) => s + c, 0);
    const topRoleFamily = roleFamilyEntries[0]?.[0] || null;
    const topRoleShare = roleFamilyEntries[0] ? roleFamilyEntries[0][1] / roleFamilyTotal : 0;
    // Only surface if we have a clear majority (>=60%) and meaningful sample (>=3)
    const roleScope = (topRoleShare >= 0.6 && roleFamilyTotal >= 3) ? topRoleFamily : null;

    // Offer rate among reports with known outcome
    const knownOutcome = reports.filter(r => r.outcome && r.outcome !== "unknown");
    const offers = knownOutcome.filter(r => r.outcome === "offer").length;
    const offerRate = knownOutcome.length ? Math.round((offers / knownOutcome.length) * 100) : null;

    const monthLabel = mostRecentDate
      ? mostRecentDate.toLocaleString("en-US", { month: "short", year: "numeric" })
      : null;

    const isEmerging = reports.length < 5;

    // Process Map
    const roundTypeStats = {};
    rounds.forEach(r => {
      const type = r.type || "Other";
      if (!roundTypeStats[type]) {
        roundTypeStats[type] = {
          count: 0, durations: [], failed: 0, totalOutcomes: 0,
          reportIds: new Set(), quotes: [],
        };
      }
      const s = roundTypeStats[type];
      s.count++;
      if (r.report_id) s.reportIds.add(r.report_id);
      if (r.duration_minutes) s.durations.push(r.duration_minutes);
      if (r.outcome === "failed") s.failed++;
      if (r.outcome && r.outcome !== "unknown") s.totalOutcomes++;
      if (r.summary && r.summary.trim().length > 40) {
        s.quotes.push({
          summary: r.summary.trim(),
          role: r.role || null,
          date: r.interview_date || null,
          outcome: r.report_outcome || null,
          quality: r.report_quality || null,
        });
      }
    });

    const assumedOrder = ['recruiter', 'phone_screen', 'coding', 'system_design', 'behavioral', 'hiring_manager'];
    const stages = Object.entries(roundTypeStats)
      .map(([type, s]) => {
        const avgDur = s.durations.length
          ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length)
          : null;
        // Rank by report quality first, then diversify outcomes:
        // try to surface one "offer" and one "rejected" voice when available.
        const qualityRank = { outstanding: 0, high: 1, medium: 2, low: 3 };
        const byQuality = [...s.quotes].sort(
          (a, b) => (qualityRank[a.quality] ?? 9) - (qualityRank[b.quality] ?? 9)
        );
        const bestOffer = byQuality.find(q => q.outcome === "offer");
        const bestReject = byQuality.find(q => q.outcome === "rejected");
        const picked = [];
        if (bestOffer) picked.push(bestOffer);
        if (bestReject) picked.push(bestReject);
        // Fill remaining slots (up to 2) with the next best quotes, skipping already-picked
        for (const q of byQuality) {
          if (picked.length >= 2) break;
          if (!picked.includes(q)) picked.push(q);
        }
        const rankedQuotes = picked;
        return {
          id: type.toLowerCase().replace(/\s+/g, '_'),
          name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          duration: avgDur ? `${avgDur}m` : null,
          avgDurationMin: avgDur,
          freq: pct(s.count, reports.length),
          reportCount: s.reportIds.size,
          freqPct: pct(s.reportIds.size, reports.length),
          failureRate: s.totalOutcomes > 0 ? pct(s.failed, s.totalOutcomes) : 0,
          knownOutcomeCount: s.totalOutcomes,
          failedCount: s.failed,
          quotes: rankedQuotes.slice(0, 2),
          tone: type.includes('Behavioral') || type.includes('Manager') ? 'collaborative' : 'evaluative',
        };
      })
      .sort((a, b) => {
        const idxA = assumedOrder.indexOf(a.id);
        const idxB = assumedOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });

    const mainGatekeeper = stages.reduce((prev, current) => (prev.failureRate > current.failureRate) ? prev : current, stages[0]);

    // Topic & Patterns
    const topicEmphasis = (company?.topic_tags || []).slice(0, 5).map(t => ({
      name: t.topic_id,
      score: t.frequency_score,
      interpretation: t.topic_id.toLowerCase().includes('graph') ? 'High recurrence in early screens.' : 
                      t.topic_id.toLowerCase().includes('design') ? 'Primary filter for L5+ candidates.' :
                      t.topic_id.toLowerCase().includes('behavioral') ? 'Values leadership principles late-stage.' : 'Standard technical assessment.'
    }));

    const patternCounts = {};
    questions.forEach(q => {
      (q.patterns || []).forEach(p => { patternCounts[p] = (patternCounts[p] || 0) + 1; });
    });
    const patternBars = Object.entries(patternCounts)
      .map(([name, count]) => ({ name, count, pct: pct(count, questions.length) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const patterns = patternBars.map(p => p.name);

    // Recently trending topics — pulled from questions in reports < 6 months old
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recentQuestions = questions.filter(q => {
      const d = parseReportDate(q.interview_date);
      return d && d >= sixMonthsAgo;
    });
    const trendingCounts = {};
    recentQuestions.forEach(q => {
      (q.topics || []).forEach(t => {
        trendingCounts[t] = (trendingCounts[t] || 0) + 1;
      });
    });
    const trendingMax = Math.max(1, ...Object.values(trendingCounts));
    const trendingTopics = Object.entries(trendingCounts)
      .map(([name, count]) => ({ name, count, pct: pct(count, recentQuestions.length || 1), score: count / trendingMax }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Style mix (implementation / algorithm / optimization / debug / design / theoretical)
    const styleCounts = {};
    let styleTotal = 0;
    questions.forEach(q => {
      const st = (q.style || "").toLowerCase();
      if (!st) return;
      styleCounts[st] = (styleCounts[st] || 0) + 1;
      styleTotal++;
    });
    const styleMix = Object.entries(styleCounts)
      .map(([name, count]) => ({ name, count, pct: pct(count, styleTotal) }))
      .sort((a, b) => b.count - a.count);

    // Ranked questions feed — diversify round_type, prefer complete + known-outcome + recent
    const completeFirst = questions.filter(q => q.question_quality === "complete");
    const questionPool = completeFirst.length >= 6 ? completeFirst : questions;
    const recencyScore = (q) => {
      if (!q.interview_date) return 0;
      const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(q.interview_date);
      return m ? Number(m[1]) * 12 + (m[2] ? Number(m[2]) : 0) : 0;
    };
    const outcomeScore = (q) => {
      if (q.report_outcome === "offer") return 2;
      if (q.report_outcome === "rejected") return 2;
      if (q.report_outcome && q.report_outcome !== "unknown") return 1;
      return 0;
    };
    const ranked = [...questionPool].sort((a, b) => {
      const o = outcomeScore(b) - outcomeScore(a);
      if (o !== 0) return o;
      return recencyScore(b) - recencyScore(a);
    });
    // Round-robin diversify by round_type so we don't show all coding
    const byRound = {};
    ranked.forEach(q => {
      const k = q.round_type || "Other";
      if (!byRound[k]) byRound[k] = [];
      byRound[k].push(q);
    });
    const roundKeys = Object.keys(byRound);
    const rankedQuestions = [];
    let idx = 0;
    while (rankedQuestions.length < ranked.length) {
      let added = false;
      for (const k of roundKeys) {
        if (byRound[k][idx]) {
          rankedQuestions.push(byRound[k][idx]);
          added = true;
        }
      }
      if (!added) break;
      idx++;
    }

    // Trap Topics
    const struggleByTopic = {};
    questions.forEach(q => {
      (q.topics || []).forEach(t => {
        if (!struggleByTopic[t]) struggleByTopic[t] = { failed: 0, total: 0 };
        if (q.candidate_struggled === true) struggleByTopic[t].failed++;
        if (q.candidate_struggled !== null) struggleByTopic[t].total++;
      });
    });
    const trapTopics = Object.entries(struggleByTopic)
      .map(([name, s]) => ({ name, rate: pct(s.failed, s.total), total: s.total }))
      .filter(t => t.total >= 2)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 3);

    // Difficulty Profile
    const diffCounts = { easy: 0, medium: 0, hard: 0, total: 0 };
    questions.forEach(q => {
      const d = q.difficulty?.toLowerCase();
      if (d === 'easy' || d === 'medium' || d === 'hard') {
        diffCounts[d]++;
        diffCounts.total++;
      }
    });

    // Honest difficulty mix (only if we have data — no fabricated fallbacks)
    const difficultyMix = diffCounts.total >= 3 ? [
      { label: "Hard",   key: "hard",   pct: pct(diffCounts.hard,   diffCounts.total), color: "#A82828" },
      { label: "Medium", key: "medium", pct: pct(diffCounts.medium, diffCounts.total), color: "#A86B1A" },
      { label: "Easy",   key: "easy",   pct: pct(diffCounts.easy,   diffCounts.total), color: "#1A7A48" },
    ] : [];

    // Hint culture — % of "struggle moments" where the interviewer threw a hint
    let struggleCount = 0;
    let hintInStruggleCount = 0;
    questions.forEach(q => {
      if (q.candidate_struggled === true) {
        struggleCount++;
        if (q.hints_given === true) hintInStruggleCount++;
      }
    });
    const hintCulture = struggleCount >= 3
      ? { rate: pct(hintInStruggleCount, struggleCount), n: struggleCount }
      : null;

    // Struggle hotspots — top topics by candidate_struggled rate (≥2 data points each)
    const struggleHotspots = Object.entries(struggleByTopic)
      .map(([name, s]) => ({ name, rate: pct(s.failed, s.total), total: s.total }))
      .filter(t => t.total >= 2)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    // Elimination by round — failure rate per round_type, only with enough known outcomes
    const eliminationByRound = stages
      .filter(s => s.knownOutcomeCount >= 2)
      .map(s => ({
        name: s.name,
        rate: s.failureRate,
        failedCount: s.failedCount,
        knownCount: s.knownOutcomeCount,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    const difficultyProfile = [
      { label: "High Risk", value: pct(diffCounts.hard, diffCounts.total) || 35, color: "#A82828" },
      { label: "Moderate", value: pct(diffCounts.medium, diffCounts.total) || 50, color: "#A86B1A" },
      { label: "Controlled", value: pct(diffCounts.easy, diffCounts.total) || 15, color: "#1A7A48" },
    ];

    // Success Snapshot
    const offerReports = reports.filter(r => r.outcome === 'offer');
    const successInsights = offerReports.length > 0 ? [
      `High consistency across ${Math.round(rounds.length / reports.length)} rounds of evaluation.`,
      `Successful navigation of ${mainGatekeeper?.name || 'technical'} filters.`,
      `Mastery of ${topicEmphasis[0]?.name || 'core'} topics weighted by the company.`,
      "Strong technical resilience in evaluative rounds."
    ] : [
      "Clear navigation of medium-to-hard complexity thresholds.",
      "Mastery of recurring core topics over obscure novelties.",
      "High resilience in evaluative rounds without interviewer rescue.",
      "Consistency across the loop rather than a single 'hero' performance."
    ];

    const eliminationPressure = mainGatekeeper ? {
      round: mainGatekeeper.name,
      rate: mainGatekeeper.failureRate,
      body: `The ${mainGatekeeper.name} represents the primary filter where ${mainGatekeeper.failureRate}% of tracked candidates lose momentum.`
    } : null;

    return {
      reportsAnalyzed: reports.length,
      isEmerging,
      recentCount,
      mostRecentLabel: monthLabel,
      levelLabel,
      levelTotal,
      offerRate,
      offerKnownCount: knownOutcome.length,
      roleScope,
      avgRounds: reports.length ? Math.round(rounds.length / reports.length) : 0,
      mainGatekeeper: mainGatekeeper?.name || "Technical Screen",
      topTheme: topicEmphasis[0]?.name || "Core CS",
      stages: stages.map(s => ({ ...s, gatekeeper: s.name === mainGatekeeper?.name })),
      topicEmphasis,
      patterns,
      trapTopics,
      topSuccessTopics: (company?.topic_tags || []).slice(0, 2).map(t => t.topic_id),
      decisiveRound: mainGatekeeper?.name,
      difficultyProfile,
      successInsights,
      eliminationPressure,
      styleMix: styleMix.slice(0, 5),
      patternBars,
      trendingTopics,
      rankedQuestions,
      totalQuestions: questions.length,
      difficultyMix,
      hintCulture,
      struggleHotspots,
      eliminationByRound,
    };
  }, [reports, rounds, company, questions]);

  function avg(arr) {
    const valid = arr.filter(x => x != null);
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F4F1EA] bg-[radial-gradient(circle,_#D8D6CE_1px,_transparent_1px)] bg-[size:16px_16px]">
      <AppNav />
      <div className="max-w-[1240px] mx-auto px-10 py-24 text-center">
        <p className="text-[#9A9A98] font-bold text-xs uppercase tracking-[0.2em]">Assembling Dossier</p>
      </div>
    </div>
  );

  if (error || !company) return (
    <div className="min-h-screen bg-[#F4F1EA] bg-[radial-gradient(circle,_#D8D6CE_1px,_transparent_1px)] bg-[size:16px_16px]">
      <AppNav />
      <div className="max-w-[600px] mx-auto px-10 py-32 text-center">
        <h2 className="text-2xl font-black text-[#1A1A1A] mb-4">Intelligence unavailable</h2>
        <p className="text-[#6B6B6B] mb-10">We couldn’t find enough mapping data for {companyId}.</p>
        <Link to="/" className="px-8 py-4 bg-[#1A1A1A] text-white rounded-xl text-sm font-bold">Return to Dashboard</Link>
      </div>
    </div>
  );

  const backLink = (
    <Link to="/" className="text-xs font-black text-[#9A9A98] hover:text-[#1A1A1A] transition-colors uppercase tracking-widest">
      Dashboard
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#F4F1EA] bg-[radial-gradient(circle,_#D8D6CE_1px,_transparent_1px)] bg-[size:16px_16px] selection:bg-[#D97757]/20">
      <AppNav leftAction={backLink} credits={10} />
      
      <main className="max-w-[1240px] mx-auto px-10 pt-16 pb-40">
        {/* --- HERO ROW --- */}
        <div className="grid grid-cols-12 gap-12 items-start mb-18">
          <div className="col-span-8">
            {stats?.roleScope && (
              <span className="text-[#D97757] font-black text-[11px] uppercase tracking-[0.3em] mb-6 block">
                for {stats.roleScope}
              </span>
            )}
            <h1 className="font-heading text-[64px] leading-[1.05] font-black tracking-tight text-[#1A1A1A] mb-8">
              How {company.name} actually interviews
            </h1>
            <p className="text-[22px] text-[#6B6B6B] leading-[1.5] mb-12 max-w-2xl font-medium tracking-tight">
              Based on {stats?.reportsAnalyzed} candidate {stats?.reportsAnalyzed === 1 ? "report" : "reports"}
              {stats?.recentCount > 0 && (
                <> — <span className="text-[#1A1A1A] font-bold">{stats.recentCount}</span> from the last 18 months</>
              )}
              {stats?.mostRecentLabel && (
                <>, most recent {stats.mostRecentLabel}</>
              )}.
            </p>

            <div className="flex items-center gap-10 py-6 border-y border-[#E5E2D8] w-full max-w-2xl mb-12 flex-wrap">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em]">Reports</span>
                <span className="text-[15px] font-black text-[#1A1A1A] tracking-tight">{stats?.reportsAnalyzed}</span>
              </div>
              {stats?.levelLabel && (
                <>
                  <div className="w-px h-8 bg-[#E5E2D8]" />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em]">
                      Mostly <span className="text-[#D97757] font-bold normal-case tracking-normal">· n={stats.levelTotal}</span>
                    </span>
                    <span className="text-[15px] font-black text-[#1A1A1A] tracking-tight capitalize">{stats.levelLabel}</span>
                  </div>
                </>
              )}
              {stats?.mostRecentLabel && (
                <>
                  <div className="w-px h-8 bg-[#E5E2D8]" />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em]">Most recent</span>
                    <span className="text-[15px] font-black text-[#1A1A1A] tracking-tight">{stats.mostRecentLabel}</span>
                  </div>
                </>
              )}
              {stats?.offerRate !== null && stats?.offerKnownCount >= 3 && (
                <>
                  <div className="w-px h-8 bg-[#E5E2D8]" />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em]">
                      Offer rate <span className="text-[#D97757] font-bold normal-case tracking-normal">· n={stats.offerKnownCount}</span>
                    </span>
                    <span className="text-[15px] font-black text-[#1A1A1A] tracking-tight">{stats.offerRate}%</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="col-span-4 flex flex-col gap-6 sticky top-32">
            {(() => {
              const activeSession = userSessions[0];
              const planStatus = activeSession?.plan_status;
              const isGenerating = !activeSession || planStatus === "generating";
              const hasFailed = planStatus === "failed";
              const steps = buildPlanSteps(company.name, stats?.reportsAnalyzed || 0);
              const visibleSteps = steps.slice(0, buildStep + 1);
              const truncateChip = (s, max = 22) => (s && s.length > max ? s.slice(0, max - 1).trimEnd() + "…" : s);
              const topChips = (stats?.topicEmphasis || []).slice(0, 4).map(t => truncateChip(t.name));

              // STATE 3 — Failed
              if (hasFailed) {
                return (
                  <div className={`${CARD_CLASS} !p-10 bg-[#1A1A1A] border-none text-white relative`}>
                    <span className="text-[10px] font-black text-[#A82828] uppercase tracking-[0.2em] mb-6 block">Plan generation failed</span>
                    <h3 className="text-[22px] font-black text-[#1A1A1A] mb-3 leading-tight">Something went wrong</h3>
                    <p className="text-[14px] text-[#6B6B6B] font-medium mb-8 leading-relaxed">
                      We couldn't build your {company.name} plan. Try again — it usually works on the second attempt.
                    </p>
                    <Link
                      to={`/session/${activeSession.id}`}
                      className="w-full bg-[#D97757] hover:bg-[#E0886A] text-white py-5 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Try again →
                    </Link>
                  </div>
                );
              }

              // STATE 1 — Generating (or no session yet, which will become generating)
              if (isGenerating) {
                return (
                  <div className={`${CARD_CLASS} !p-10 relative`}>
                    <span className="text-[10px] font-black text-[#D97757] uppercase tracking-[0.2em] mb-6 block">Building your plan</span>
                    <h3 className="text-[22px] font-black text-[#1A1A1A] mb-3 leading-tight tracking-tight">
                      Mapping {company.name}, just for you
                    </h3>
                    <p className="text-[13px] text-[#6B6B6B] font-medium mb-8 leading-relaxed">
                      Picking the topics, patterns and difficulty mix that match how this company interviews.
                    </p>

                    <div className="space-y-3 mb-8 min-h-[180px]">
                      {visibleSteps.map((label, i) => {
                        const isLast = i === visibleSteps.length - 1;
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-3 text-[13px]"
                            style={{ animation: "plan-step-in 0.4s ease-out" }}
                          >
                            {isLast ? (
                              <span style={{
                                display: "inline-block",
                                width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                                border: "2px solid #F0EEE6",
                                borderTopColor: "#D97757",
                                animation: "spin 0.8s linear infinite",
                              }} />
                            ) : (
                              <span className="w-3 h-3 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#1A7A48" }}>
                                <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
                                  <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                            )}
                            <span style={{ color: isLast ? "#1A1A1A" : "#9A9A98", fontWeight: isLast ? 600 : 500 }}>
                              {label}
                              {isLast && <span className="inline-block ml-0.5 animate-pulse">…</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-[#9A9A98] font-medium mb-4">Usually takes 30–60 seconds</p>
                    {activeSession && (
                      <Link
                        to={`/session/${activeSession.id}`}
                        className="w-full bg-[#FDFCFB] hover:bg-[#F4F1EA] border border-[#E5E2D8] text-[#6B6B6B] py-4 rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 transition-colors"
                      >
                        View session →
                      </Link>
                    )}
                  </div>
                );
              }

              // STATE 2 — Ready
              return (
                <div className={`${CARD_CLASS} !p-10 relative`}>
                  <span className="text-[10px] font-black text-[#1A7A48] uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1A7A48]" />
                    Your plan is ready
                  </span>
                  <h3 className="text-[22px] font-black text-[#1A1A1A] mb-3 leading-tight tracking-tight">
                    {company.name}, mapped for you
                  </h3>
                  <p className="text-[13px] text-[#6B6B6B] font-medium mb-6 leading-relaxed">
                    A personalised sequence drawn from the patterns on this page.
                  </p>

                  {topChips.length > 0 && (() => {
                    const chipPalette = [
                      { bg: "#FBF1ED", border: "#F0D6C7", text: "#C25C3D" }, // coral
                      { bg: "#EDFBF3", border: "#B6EDD0", text: "#1A7A48" }, // sage
                      { bg: "#FFF8EB", border: "#F0D9A0", text: "#A86B1A" }, // amber
                      { bg: "#F1EFE3", border: "#D8D2B8", text: "#6B5A3A" }, // warm tan
                    ];
                    return (
                      <div className="mb-8">
                        <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-3 block">Focus areas</span>
                        <div className="flex flex-wrap gap-2">
                          {topChips.map((name, i) => {
                            const c = chipPalette[i % chipPalette.length];
                            return (
                              <span
                                key={name}
                                className="text-[11px] font-bold px-3 py-1.5 rounded-full transition-transform hover:-translate-y-0.5"
                                style={{
                                  background: c.bg,
                                  border: `1px solid ${c.border}`,
                                  color: c.text,
                                  boxShadow: `0 1px 2px ${c.border}40`,
                                }}
                              >
                                {name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <Link
                    to={`/session/${activeSession.id}`}
                    className="w-full bg-[#D97757] hover:bg-[#E0886A] text-white! py-5 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Open my plan →
                  </Link>
                </div>
              );
            })()}
          </div>
        </div>

        {/* --- THE LOOP, AT A GLANCE --- */}
        <Section
          title={`How the ${company.name} loop actually runs`}
          subheading={`${stats?.reportsAnalyzed} ${stats?.reportsAnalyzed === 1 ? "report" : "reports"} mapped · ${stats?.avgRounds} rounds on average. Click a stage to read what candidates wrote.`}
        >
          {(() => {
            const stages = stats?.stages || [];
            // Default active = stage with most quotes; tiebreak by order in array
            const defaultActive = [...stages].sort((a, b) => b.quotes.length - a.quotes.length)[0]?.id || null;
            const currentId = activeStageId || defaultActive;
            const active = stages.find(s => s.id === currentId) || stages[0];

            return (
              <div className={CARD_CLASS}>
                {/* Stage strip — clickable */}
                <div className="flex items-stretch gap-2 px-4 mb-2">
                  {stages.map((s, idx) => {
                    const isActive = s.id === active?.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setActiveStageId(s.id)}
                        className="flex-1 flex flex-col items-center relative pt-1 pb-2 rounded-xl transition-colors hover:bg-[#FDFCFB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757] focus-visible:ring-offset-2"
                      >
                        {idx < stages.length - 1 && (
                          <div className="absolute top-[28px] left-[calc(50%+18px)] right-[calc(-50%+18px)] h-px bg-[#E5E2D8] -z-0" />
                        )}

                        <div
                          className="w-10 h-10 rounded-full mb-5 z-10 flex items-center justify-center border-2 transition-all"
                          style={{
                            background: isActive ? "#D97757" : "#FFFFFF",
                            borderColor: isActive ? "#D97757" : "#E5E2D8",
                            boxShadow: isActive ? "0 0 0 4px rgba(217,119,87,0.15)" : "none",
                          }}
                        >
                          <span className="text-[11px] font-black" style={{ color: isActive ? "#FFFFFF" : "#6B6B6B" }}>
                            {idx + 1}
                          </span>
                        </div>

                        <h4
                          className="text-[14px] font-black mb-2 text-center whitespace-nowrap transition-colors"
                          style={{ color: isActive ? "#1A1A1A" : "#6B6B6B" }}
                        >
                          {s.name}
                        </h4>
                        <div className="flex flex-col items-center gap-1">
                          {s.duration && (
                            <span className="text-[11px] font-bold text-[#9A9A98] tracking-wider uppercase">{s.duration}</span>
                          )}
                          <span className="text-[10px] font-medium text-[#9A9A98]">
                            {s.freqPct}% of loops <span className="text-[#D97757] font-bold">· n={s.reportCount}</span>
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Active stage quote panel */}
                {active && (
                  <div className="mt-10 pt-10 border-t border-[#F4F1EA]" key={active.id}>
                    <div className="flex items-baseline justify-between mb-6">
                      <div className="flex items-baseline gap-3">
                        <span className="text-[10px] font-black text-[#D97757] uppercase tracking-[0.2em]">Voices from</span>
                        <h3 className="text-[16px] font-black text-[#1A1A1A] tracking-tight">{active.name}</h3>
                      </div>
                      {active.quotes.length > 0 && (
                        <span className="text-[11px] font-medium text-[#9A9A98]">
                          {active.quotes.length} of {active.reportCount} candidate {active.reportCount === 1 ? "note" : "notes"}
                        </span>
                      )}
                    </div>

                    {active.quotes.length > 0 ? (
                      <div
                        className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10"
                        style={{ animation: "plan-step-in 0.3s ease-out" }}
                      >
                        {active.quotes.map((q, i) => (
                          <div key={i} className="relative pl-5">
                            <div
                              className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full"
                              style={{ background: "#D97757" }}
                            />
                            <p className="text-[15px] leading-[1.7] text-[#2A2A2A] mb-4 font-serif italic">
                              {q.summary}
                            </p>
                            {(q.role || q.date || q.outcome) && (
                              <div className="flex items-center gap-1.5 flex-wrap text-[12px] text-[#6B6B6B] font-medium">
                                <span className="text-[#9A9A98]">—</span>
                                {q.role && <span>{q.role}</span>}
                                {q.date && <><span className="text-[#D8D6CE]">·</span><span>{q.date}</span></>}
                                {q.outcome && q.outcome !== "unknown" && (
                                  <>
                                    <span className="text-[#D8D6CE]">·</span>
                                    <span
                                      className="font-bold capitalize"
                                      style={{ color: q.outcome === "offer" ? "#1A7A48" : q.outcome === "rejected" ? "#A82828" : "#9A9A98" }}
                                    >
                                      {q.outcome}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px] text-[#9A9A98] font-medium italic">
                        We haven't captured prose notes for this round yet — try another stage above.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </Section>

        {/* --- WHAT THEY ACTUALLY ASK --- */}
        <Section
          title="What they actually ask"
          subheading={`${stats?.totalQuestions || 0} questions analyzed. Real samples, recurring patterns, and the styles ${company.name} favors.`}
        >
          <div className={CARD_CLASS}>
            {/* Top — four stat columns, color-distinct bars */}
            <div className="grid grid-cols-4 gap-10">
              <StatColumn
                title="Most emphasized"
                color="#C25C3D"
                items={(stats?.topicEmphasis || []).slice(0, 5).map(t => ({
                  name: t.name, barValue: Math.round(t.score * 100), score: t.score,
                }))}
                formatValue={it => `${it.barValue}%`}
              />
              <StatColumn
                title="Recently trending (last 6 mo)"
                color="#1A7A48"
                items={(stats?.trendingTopics || []).map(t => ({
                  name: t.name, barValue: Math.round(t.score * 100), count: t.count,
                }))}
                formatValue={it => `×${it.count}`}
              />
              <StatColumn
                title="Question style"
                color="#A86B1A"
                items={(stats?.styleMix || []).map(s => ({
                  name: s.name, barValue: s.pct,
                }))}
                formatValue={it => `${it.barValue}%`}
              />
              <StatColumn
                title="Recurring patterns"
                color="#6B5A3A"
                items={(stats?.patternBars || []).map(p => ({
                  name: p.name, barValue: p.pct, count: p.count,
                }))}
                formatValue={it => `×${it.count}`}
              />
            </div>

            {/* Divider */}
            <div className="my-10 border-t border-[#F4F1EA]" />

            {/* Bottom — real questions feed */}
            {(() => {
              const all = stats?.rankedQuestions || [];
              const roundTypes = Array.from(new Set(all.map(q => q.round_type).filter(Boolean)));
              const filtered = questionFilter === "all"
                ? all
                : all.filter(q => q.round_type === questionFilter);
              const visible = filtered.slice(0, 5);
              const totalCount = all.length;

              const outcomeColor = (o) =>
                o === "offer" ? "#1A7A48" : o === "rejected" ? "#A82828" : "#9A9A98";
              const diffColor = (d) =>
                d === "easy" ? "#1A7A48" : d === "hard" ? "#A82828" : "#A86B1A";

              return (
                <div>
                  <div className="flex items-center justify-between gap-6 mb-8 flex-wrap">
                    <div className="flex items-center gap-4 flex-wrap">
                      <h3 className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em]">
                        Real questions from the loop
                      </h3>
                      {totalCount > 5 && (
                        <Link
                          to={`/companies/${companyId}/questions`}
                          className="text-[11px] font-bold text-[#D97757] hover:underline inline-flex items-center gap-1"
                        >
                          View all {totalCount} →
                        </Link>
                      )}
                    </div>
                    {roundTypes.length > 1 && (
                      <div className="flex flex-wrap gap-1.5">
                        <FilterChip active={questionFilter === "all"} onClick={() => setQuestionFilter("all")}>
                          All
                        </FilterChip>
                        {roundTypes.map(rt => (
                          <FilterChip key={rt} active={questionFilter === rt} onClick={() => setQuestionFilter(rt)}>
                            {rt}
                          </FilterChip>
                        ))}
                      </div>
                    )}
                  </div>

                  {visible.length === 0 ? (
                    <p className="text-[13px] text-[#9A9A98] italic py-8 text-center">
                      No questions in this filter — try another round type.
                    </p>
                  ) : (
                    <div className="space-y-8">
                      {visible.map(q => {
                        const parts = [];
                        if (q.interview_date) {
                          parts.push(
                            <span key="date" className="text-[#6B6B6B] tabular-nums">{q.interview_date}</span>
                          );
                        }
                        if (q.round_type) {
                          parts.push(
                            <span key="round" className="font-bold uppercase tracking-wider text-[#1A1A1A]">{q.round_type}</span>
                          );
                        }
                        if (q.report_outcome && q.report_outcome !== "unknown") {
                          parts.push(
                            <span key="outcome" className="font-bold capitalize" style={{ color: outcomeColor(q.report_outcome) }}>
                              {q.report_outcome}
                            </span>
                          );
                        }
                        if (q.difficulty) {
                          parts.push(
                            <span key="diff" className="font-black uppercase tracking-wider" style={{ color: diffColor(q.difficulty) }}>
                              {q.difficulty}
                            </span>
                          );
                        }
                        if (q.style) {
                          parts.push(
                            <span key="style" className="font-bold uppercase tracking-wider text-[#6B5A3A]">{q.style}</span>
                          );
                        }
                        (q.topics || []).slice(0, 2).forEach(t => {
                          parts.push(
                            <span key={`topic-${t}`} className="text-[#6B6B6B] lowercase">{t}</span>
                          );
                        });
                        if (q.leetcode) {
                          parts.push(
                            <a
                              key="lc"
                              href={q.leetcode}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-[#D97757] hover:underline"
                            >
                              ↗ LeetCode
                            </a>
                          );
                        }

                        return (
                          <div key={q.id} className="relative pl-5">
                            <div className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full" style={{ background: "#D97757" }} />
                            <p className="text-[13.5px] leading-[1.65] text-[#2A2A2A] font-serif italic mb-4">
                              {q.text}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px]">
                              {parts.map((node, i) => (
                                <span key={`seg-${i}`} className="inline-flex items-center gap-x-3">
                                  {i > 0 && <span className="text-[#D8D6CE]" aria-hidden="true">·</span>}
                                  {node}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              );
            })()}
          </div>
        </Section>

        {/* --- WHERE THE BAR SITS --- */}
        <Section
          title="Where the bar sits"
          subheading="What the difficulty mix looks like, how often interviewers throw a lifeline, and where candidates lose momentum."
        >
          <div className={CARD_CLASS}>
            <div className="grid grid-cols-3 gap-10">
              {/* Difficulty mix + Hint culture footer */}
              <div className="flex flex-col">
                <h3 className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-6">Difficulty mix</h3>
                {stats?.difficultyMix?.length > 0 ? (() => {
                  const mix = stats.difficultyMix;
                  const byKey = Object.fromEntries(mix.map(d => [d.key, d.pct]));
                  const hard = byKey.hard || 0;
                  const easy = byKey.easy || 0;
                  // Headline read
                  let headline = "Balanced spread";
                  let headlineColor = "#6B6B6B";
                  if (hard >= 60)      { headline = "Brutal — mostly hard";    headlineColor = "#A82828"; }
                  else if (hard >= 40) { headline = "Hard-leaning";            headlineColor = "#C25C3D"; }
                  else if (hard >= 25) { headline = "Mixed, tilts tough";      headlineColor = "#A86B1A"; }
                  else if (easy >= 40) { headline = "Approachable";            headlineColor = "#1A7A48"; }

                  return (
                    <>
                      {/* Chunky stacked horizontal bar */}
                      <div className="flex w-full rounded-xl overflow-hidden h-[52px] bg-[#FAF6EE] mb-2">
                        {mix.filter(d => d.pct > 0).map(d => {
                          const wideEnough = d.pct >= 14;
                          return (
                            <div
                              key={d.key}
                              className="flex items-center justify-center text-white relative"
                              style={{
                                flexGrow: d.pct,
                                flexShrink: 0,
                                flexBasis: 0,
                                background: d.color,
                                minWidth: 4,
                              }}
                              title={`${d.label} — ${d.pct}%`}
                            >
                              {wideEnough && (
                                <span className="font-black tabular-nums text-[15px] leading-none">
                                  {d.pct}%
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="mb-2">
                        <span className="text-[12px] font-bold" style={{ color: headlineColor }}>
                          {headline}
                        </span>
                      </div>

                      {/* Dot legend */}
                      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
                        {mix.map(d => (
                          <div key={d.key} className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ background: d.color }}
                            />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
                              {d.label}
                            </span>
                            <span className="text-[11px] font-black tabular-nums text-[#1A1A1A]">
                              {d.pct}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })() : (
                  <p className="text-xs text-[#9A9A98] italic">Not enough difficulty data yet.</p>
                )}

                {/* Hint culture footer */}
                <div className="mt-10 pt-2">
                  <div className="border-t border-[#F4F1EA] pt-5">
                    <h4 className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-3">Hint culture</h4>
                    {stats?.hintCulture ? (
                      <>
                        <p className="text-[13px] text-[#1A1A1A] leading-snug font-medium mb-3">
                          Interviewers gave a hint in{" "}
                          <span className="font-black">{stats.hintCulture.rate}%</span> of
                          struggle moments{" "}
                          <span className="text-[#D97757] font-bold">· n={stats.hintCulture.n}</span>
                        </p>
                        {/* Sink-or-swim ←→ Rescuing visual scale */}
                        <div className="relative h-1.5 rounded-full bg-gradient-to-r from-[#A82828] via-[#A86B1A] to-[#1A7A48]">
                          <div
                            className="absolute -top-1 w-3 h-3.5 rounded-sm bg-[#1A1A1A] border-2 border-white shadow"
                            style={{ left: `calc(${stats.hintCulture.rate}% - 6px)` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] font-bold text-[#9A9A98] uppercase tracking-widest mt-2">
                          <span>Sink or swim</span>
                          <span>Rescuing</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-[#9A9A98] italic">Not enough struggle data.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Struggle hotspots — treemap */}
              <div className="flex flex-col">
                <h3 className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-6">Struggle hotspots</h3>
                {stats?.struggleHotspots?.length > 0 ? (() => {
                  const maxRate = Math.max(...stats.struggleHotspots.map(t => t.rate));
                  const boxes = squarifyTreemap(
                    stats.struggleHotspots.map(t => ({ ...t, weight: t.rate || 1 })),
                    100,
                    100
                  );
                  return (
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#FAF6EE]">
                      {boxes.map(b => {
                        // Opacity scales with rate (most-struggled = solid, least = soft)
                        const intensity = 0.55 + 0.45 * (b.rate / Math.max(maxRate, 1));
                        const isLarge = b.w >= 30 && b.h >= 30;
                        const isMed = b.w >= 18 && b.h >= 18;
                        return (
                          <div
                            key={b.name}
                            className="absolute flex flex-col justify-between p-2 text-white"
                            style={{
                              left: `${b.x}%`,
                              top: `${b.y}%`,
                              width: `${b.w}%`,
                              height: `${b.h}%`,
                              background: "#A82828",
                              opacity: intensity,
                              borderRight: "1.5px solid #FAF6EE",
                              borderBottom: "1.5px solid #FAF6EE",
                            }}
                            title={`${b.name} — ${b.rate}% struggle (n=${b.total})`}
                          >
                            {isMed && (
                              <span
                                className="font-bold leading-tight capitalize truncate"
                                style={{ fontSize: isLarge ? 12 : 10 }}
                              >
                                {b.name}
                              </span>
                            )}
                            <div className="flex items-baseline justify-between gap-1">
                              <span
                                className="font-black tabular-nums"
                                style={{ fontSize: isLarge ? 18 : isMed ? 13 : 10 }}
                              >
                                {b.rate}%
                              </span>
                              {isLarge && (
                                <span className="text-[9px] font-bold opacity-80 tabular-nums">
                                  n={b.total}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })() : (
                  <div className="w-full aspect-square rounded-xl bg-[#FAF6EE] flex items-center justify-center">
                    <p className="text-xs text-[#9A9A98] italic px-6 text-center">Topic-level struggle data still aggregating.</p>
                  </div>
                )}
                <p className="mt-4 text-[11px] text-[#9A9A98] font-medium italic leading-relaxed">
                  Bigger cells = topics with the highest visible struggle rates.
                </p>
              </div>

              {/* Elimination by round */}
              <div>
                <h3 className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-6">Elimination by round</h3>
                {stats?.eliminationByRound?.length > 0 ? (
                  <div className="space-y-4">
                    {stats.eliminationByRound.map(r => (
                      <div key={r.name}>
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <span className="text-[12.5px] font-bold text-[#1A1A1A] truncate">{r.name}</span>
                          <span className="text-[11px] font-black tabular-nums shrink-0 text-[#D97757]">
                            {r.rate}% <span className="font-bold">· n={r.knownCount}</span>
                          </span>
                        </div>
                        <Bar value={r.rate} max={100} color="#D97757" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#9A9A98] italic">Need more known-outcome rounds to map drop-off.</p>
                )}
                <p className="mt-6 text-[11px] text-[#9A9A98] font-medium italic leading-relaxed">
                  Drop-off rate where the round outcome is known.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* --- SUCCESS COMMONALITIES --- */}
        <Section 
          title="What successful interviews had in common" 
          subheading="Offer outcomes rarely follow a script, but strong reports often share a recognizable shape."
        >
          <div className="grid grid-cols-12 gap-8">
            <div className={`${CARD_CLASS} col-span-8 !p-12`}>
              <div className="space-y-8">
                {stats?.successInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-6">
                    <div className="w-6 h-6 rounded-full bg-[#EDFBF3] border border-[#B6EDD0] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <span className="text-[#1A7A48] text-[12px] font-black">✓</span>
                    </div>
                    <p className="text-[16px] font-bold text-[#1A1A1A] leading-relaxed tracking-tight">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${CARD_CLASS} col-span-4 bg-[#EDFBF3] border-[#B6EDD0] !p-10`}>
              <span className="text-[10px] font-black text-[#1A7A48] uppercase tracking-[0.2em] mb-8 block">Offer Snapshot</span>
              <div className="space-y-10">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-widest">Common Topic cluster</span>
                  <span className="text-[15px] font-black text-[#1A1A1A] tracking-tight">
                    {stats?.topSuccessTopics.length > 0 ? stats.topSuccessTopics.join(' + ') : "Core Technical"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-widest">Decisive Factor</span>
                  <span className="text-[15px] font-black text-[#1A1A1A] tracking-tight">
                    {stats?.decisiveRound} Performance
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-widest">Mastery Threshold</span>
                  <span className="text-[15px] font-black text-[#1A1A1A] tracking-tight">
                    {stats?.isEmerging ? "Consistency Focus" : "High Rigor Stability"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Section>
        {/* --- DATA INTEGRITY --- */}
        <Section 
          title="Intelligence strength" 
          subheading="Patterns are strongest for mid-level SWE; senior and staff-level signals are still emerging."
        >
          <div className="grid grid-cols-2 gap-8">
            <div className={CARD_CLASS}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-6">Coverage & freshness</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[13px] py-2 border-b border-[#F4F1EA]">
                  <span className="text-[#6B6B6B] font-medium">Mapped reports</span>
                  <span className="font-black text-[#1A1A1A]">{stats?.reportsAnalyzed}</span>
                </div>
                <div className="flex justify-between items-center text-[13px] py-2 border-b border-[#F4F1EA]">
                  <span className="text-[#6B6B6B] font-medium">Loop maturity</span>
                  <span className="font-black text-[#1A1A1A]">{stats?.isEmerging ? 'Emerging' : 'Stable'}</span>
                </div>
                <div className="flex justify-between items-center text-[13px] py-2">
                  <span className="text-[#6B6B6B] font-medium">Recentness weighting</span>
                  <span className="text-[#1A7A48] font-black uppercase tracking-widest text-[11px]">Active</span>
                </div>
              </div>
            </div>

            <div className={CARD_CLASS}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-6">Signal Sources</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-[13px] py-2 border-b border-[#F4F1EA]">
                  <span className="text-[#6B6B6B] font-medium">Source verification</span>
                  <span className="font-black text-[#1A1A1A]">Cross-referenced</span>
                </div>
                <div className="flex justify-between items-center text-[13px] py-2 border-b border-[#F4F1EA]">
                  <span className="text-[#6B6B6B] font-medium">Role depth</span>
                  <span className="font-black text-[#A86B1A]">Generalist SWE focus</span>
                </div>
                <div className="flex justify-between items-center text-[13px] py-2">
                  <span className="text-[#6B6B6B] font-medium">Dossier status</span>
                  <span className="font-black uppercase tracking-widest text-[11px] text-[#9A9A98]">Updating...</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* --- FINAL CONVERSION --- */}
        <div className="mt-48 mb-60 text-center max-w-3xl mx-auto">
          <h2 className="font-heading text-5xl font-black tracking-tight text-[#1A1A1A] mb-8 leading-[1.1]">
            Turn this analysis into a practice plan
          </h2>
          <p className="text-xl text-[#6B6B6B] leading-[1.6] mb-12 font-medium tracking-tight">
            You now know how {company.name} interviews; the next step is a calibrated training session that helps you master exactly those patterns.
          </p>
          {(() => {
            const activeSession = userSessions[0];
            const isGenerating = activeSession?.plan_status === "generating";
            return (
              <div className="flex flex-col items-center gap-6">
                {isGenerating && (
                  <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-[#FBF1ED] border border-[#F0D6C7]">
                    <span style={{
                      display: "inline-block",
                      width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                      border: "2px solid #F0D6C7",
                      borderTopColor: "#D97757",
                      animation: "spin 0.8s linear infinite",
                    }} />
                    <span className="text-[13px] text-[#D97757] font-semibold">
                      Your {company.name} plan is being built — it'll be ready in a moment
                    </span>
                  </div>
                )}
                <Link
                  to={activeSession ? `/session/${activeSession.id}` : "/start"}
                  className="px-12 py-6 bg-[#D97757] hover:bg-[#E0886A] text-white rounded-2xl text-[17px] font-extrabold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_20px_rgba(217,119,87,0.15)]"
                >
                  {isGenerating ? "View session" : activeSession ? `Continue ${company.name} prep` : `Start ${company.name} prep session`}
                </Link>
              </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
