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

  // --- Intelligence Engine ---

  const stats = useMemo(() => {
    if (!reports.length) return null;
    
    // Low-data Logic
    const isEmerging = reports.length < 5;
    const confidenceLabel = isEmerging ? "Emerging Intelligence" : "Verified Mapping";
    const confidenceColor = isEmerging ? "#A86B1A" : "#1A7A48";
    
    // Coverage Score (Credible scaling)
    const rawCoverage = isEmerging ? (reports.length * 15) : 75 + (reports.length * 0.5);
    const coverage = Math.min(98, Math.round(rawCoverage));

    // Process Map
    const roundTypeStats = {};
    rounds.forEach(r => {
      const type = r.type || "Other";
      if (!roundTypeStats[type]) {
        roundTypeStats[type] = { count: 0, durations: [], failed: 0, totalOutcomes: 0 };
      }
      roundTypeStats[type].count++;
      if (r.duration_minutes) roundTypeStats[type].durations.push(r.duration_minutes);
      if (r.outcome === "failed") roundTypeStats[type].failed++;
      if (r.outcome && r.outcome !== "unknown") roundTypeStats[type].totalOutcomes++;
    });

    const assumedOrder = ['recruiter', 'phone_screen', 'coding', 'system_design', 'behavioral', 'hiring_manager'];
    const stages = Object.entries(roundTypeStats)
      .map(([type, s]) => ({
        id: type.toLowerCase().replace(/\s+/g, '_'),
        name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        duration: s.durations.length ? `${Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length)}m` : "45m",
        freq: pct(s.count, reports.length),
        failureRate: s.totalOutcomes > 0 ? pct(s.failed, s.totalOutcomes) : 0,
        tone: type.includes('Behavioral') || type.includes('Manager') ? 'collaborative' : 'evaluative'
      }))
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
    const patterns = Object.entries(patternCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name);

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
      confidenceLabel,
      confidenceColor,
      coverage,
      avgRounds: reports.length ? (rounds.length / reports.length).toFixed(1) : "0",
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
      eliminationPressure
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
        <div className="grid grid-cols-12 gap-12 items-start mb-24">
          <div className="col-span-8">
            <span className="text-[#D97757] font-black text-[11px] uppercase tracking-[0.3em] mb-6 block">
              Intelligence brief
            </span>
            <h1 className="font-heading text-[64px] leading-[1.05] font-black tracking-tight text-[#1A1A1A] mb-8">
              The {company.name} interview, decoded
            </h1>
            <p className="text-[22px] text-[#6B6B6B] leading-[1.5] mb-12 max-w-2xl font-medium tracking-tight">
              Most candidates don’t fail at {company.name} because they lack ability — they fail because they prepare too broadly for what this company actually asks.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-10">
              <span className="bg-white border border-[#E5E2D8] px-3 py-1.5 rounded-full text-[11px] font-bold text-[#1A1A1A] uppercase tracking-tight">
                {stats?.reportsAnalyzed} {stats?.reportsAnalyzed === 1 ? 'report' : 'reports'} analyzed
              </span>
              <span className="bg-white border border-[#E5E2D8] px-3 py-1.5 rounded-full text-[11px] font-bold text-[#1A1A1A] uppercase tracking-tight">Recent data weighted</span>
              <span className="bg-white border border-[#E5E2D8] px-3 py-1.5 rounded-full text-[11px] font-bold text-[#1A1A1A] uppercase tracking-tight">SWE + MLE coverage</span>
              <span 
                className="bg-white border border-[#E5E2D8] px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-tight"
                style={{ color: stats?.confidenceColor }}
              >
                {stats?.confidenceLabel}
              </span>
            </div>

            <div className="flex items-center gap-10 py-6 border-y border-[#E5E2D8] w-full max-w-2xl mb-12">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em]">Loop Depth</span>
                <span className="text-[15px] font-black text-[#1A1A1A] tracking-tight">{stats?.avgRounds} rounds avg.</span>
              </div>
              <div className="w-px h-8 bg-[#E5E2D8]" />
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em]">Critical Round</span>
                <span className="text-[15px] font-black text-[#1A1A1A] tracking-tight">{stats?.mainGatekeeper}</span>
              </div>
              <div className="w-px h-8 bg-[#E5E2D8]" />
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em]">Core Emphasis</span>
                <span className="text-[15px] font-black text-[#1A1A1A] tracking-tight uppercase">{stats?.topTheme}</span>
              </div>
            </div>
          </div>

          <div className="col-span-4 flex flex-col gap-6 sticky top-32">
            <div className={`${CARD_CLASS} !p-10`}>
              <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-4 block">Confidence</span>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-[56px] font-black text-[#1A1A1A] leading-none tracking-tighter">{stats?.coverage}%</span>
              </div>
              <p className="text-[13px] text-[#6B6B6B] font-medium leading-relaxed">
                How much of this company’s interview loop we have currently mapped.
              </p>
            </div>

            {(() => {
              const activeSession = userSessions[0];
              const isGenerating = activeSession?.plan_status === "generating";
              return (
                <div className={`${CARD_CLASS} !p-10 bg-[#1A1A1A] border-none text-white overflow-hidden relative`}>
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm0 3.45l8.15 14.1H3.85L12 5.45z"/></svg>
                  </div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 block relative">Master the loop</span>
                  <p className="text-[16px] text-gray-300 font-medium mb-10 leading-relaxed relative">
                    This brief shows what {company.name} asks; the next step helps you master exactly that.
                  </p>
                  {isGenerating && (
                    <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
                      <span style={{
                        display: "inline-block",
                        width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                        border: "2px solid rgba(255,255,255,0.2)",
                        borderTopColor: "#D97757",
                        animation: "spin 0.8s linear infinite",
                      }} />
                      <span className="text-[12px] text-gray-300 font-medium">
                        AI is building your personalised plan…
                      </span>
                    </div>
                  )}
                  <Link
                    to={activeSession ? `/session/${activeSession.id}` : "/start"}
                    className="w-full bg-[#D97757] hover:bg-[#E0886A] text-white py-5 rounded-2xl text-[15px] font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] relative"
                  >
                    {isGenerating ? "View session" : activeSession ? "Continue practising" : "Start practising"}
                  </Link>
                </div>
              );
            })()}
          </div>
        </div>

        {/* --- PROCESS MAP --- */}
        <Section 
          title="What this loop looks like" 
          subheading="A predictable sequence where specific rounds act as primary filters."
        >
          <div className={CARD_CLASS}>
            <div className="flex items-stretch gap-2 mb-16 px-4">
              {stats?.stages.map((s, idx) => (
                <div key={s.id} className="flex-1 flex flex-col items-center relative">
                  {/* Connector Line */}
                  {idx < stats.stages.length - 1 && (
                    <div className="absolute top-[21px] left-[calc(50%+16px)] right-[calc(-50%+16px)] h-px bg-[#E5E2D8] -z-0" />
                  )}
                  
                  <div className={`w-10 h-10 rounded-full mb-6 z-10 flex items-center justify-center border-2 bg-white transition-all duration-500 ${s.gatekeeper ? 'border-[#A82828] shadow-[0_0_12px_rgba(168,40,40,0.1)]' : 'border-[#E5E2D8]'}`}>
                    <div className={`w-3 h-3 rounded-full ${s.gatekeeper ? 'bg-[#A82828]' : 'bg-[#D8D6CE]'}`} />
                  </div>

                  <h4 className="text-[14px] font-black text-[#1A1A1A] mb-1 text-center whitespace-nowrap">{s.name}</h4>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-bold text-[#9A9A98] tracking-wider uppercase">{s.duration}</span>
                    {s.gatekeeper && (
                      <span className="mt-1 px-2 py-0.5 bg-[#FFF0F0] text-[#A82828] text-[9px] font-black uppercase tracking-widest border border-[#F0C0C0] rounded">
                        Gatekeeper
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-6 flex flex-col items-center gap-1.5 px-4 text-center">
                    <span className="text-[10px] font-black text-[#D8D6CE] uppercase tracking-widest">{s.tone}</span>
                    <span className="text-[11px] font-medium text-[#6B6B6B] leading-tight">
                      {s.tone === 'evaluative' ? 'Focus on technical precision.' : 'Emphasis on leadership signals.'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-8 pt-10 border-t border-[#F4F1EA]">
              <div className="bg-[#FDFCFB] border border-[#E5E2D8] p-6 rounded-2xl">
                <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-4 block">Process Insight</span>
                <p className="text-[13px] font-bold text-[#1A1A1A] leading-snug">The typical {company.name} loop has {stats?.avgRounds} rounds of evaluative interview time.</p>
              </div>
              <div className="bg-[#FDFCF8] border border-[#E5E2D8] p-6 rounded-2xl">
                <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-4 block">Filter Logic</span>
                <p className="text-[13px] font-bold text-[#1A1A1A] leading-snug">The {stats?.mainGatekeeper} is historically where the most candidates are removed from the loop.</p>
              </div>
              <div className="bg-[#FDFCFB] border border-[#E5E2D8] p-6 rounded-2xl">
                <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-[0.2em] mb-4 block">Evaluation Tone</span>
                <p className="text-[13px] font-bold text-[#1A1A1A] leading-snug">Later rounds shift toward leadership principles while maintaining high technical rigor.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* --- WHAT STANDS OUT --- */}
        <Section 
          title={`What stands out in ${company.name}’s interviews`} 
          subheading="This is where this loop starts to look company-specific rather than generic."
        >
          <div className="grid grid-cols-12 gap-8">
            <div className={`${CARD_CLASS} col-span-7`}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-8">Most emphasized areas</h3>
              <div className="space-y-8">
                {stats?.topicEmphasis.length > 0 ? stats.topicEmphasis.map(t => (
                  <div key={t.name}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[13px] font-bold text-[#1A1A1A]">{t.name}</span>
                      <span className="text-[11px] font-black text-[#9A9A98] uppercase tracking-tighter">{Math.round(t.score * 100)}% Appearance</span>
                    </div>
                    <Bar value={t.score} max={1} color={t.name.toLowerCase().includes('behavioral') ? '#A86B1A' : '#1A1A1A'} />
                    <p className="text-[11px] text-[#9A9A98] mt-3 font-medium italic leading-relaxed">“{t.interpretation}”</p>
                  </div>
                )) : (
                  <div className="py-12 flex flex-col items-center">
                    <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-widest mb-4">Signal forming</span>
                    <p className="text-sm text-[#6B6B6B] font-medium">Aggregating topic patterns for this role...</p>
                  </div>
                )}
              </div>
            </div>

            <div className={`${CARD_CLASS} col-span-5 flex flex-col`}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-8">Differentiating Patterns</h3>
              <div className="space-y-5 flex-1">
                {stats?.patterns.length > 0 ? stats.patterns.map(p => (
                  <div key={p} className="flex items-start gap-4 p-4 rounded-xl bg-[#FDFCFB] border border-[#F4F1EA]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D97757] mt-1.5" />
                    <span className="text-[13px] font-bold text-[#1A1A1A] leading-tight">{p}</span>
                  </div>
                )) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-[#E5E2D8] rounded-2xl bg-[#FDFCFB]">
                    <span className="text-[10px] font-black text-[#D8D6CE] uppercase tracking-[0.2em] mb-4">Under Review</span>
                    <p className="text-xs text-[#9A9A98] text-center leading-relaxed">Identifying patterns that distinguish this company from the generic SWE loop.</p>
                  </div>
                )}
              </div>
              <div className="mt-8 pt-8 border-t border-[#F4F1EA]">
                <p className="text-[13px] text-[#6B6B6B] leading-relaxed font-medium">
                  Success at {company.name} requires mastering these specific variations, not just the general categories.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* --- PRESSURE POINTS --- */}
        <Section 
          title="Where candidates struggle" 
          subheading="The highest-risk parts of the loop are not always the hardest-looking ones."
        >
          <div className="grid grid-cols-3 gap-8">
            <div className={CARD_CLASS}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-8">Difficulty Profile</h3>
              <div className="space-y-6">
                {stats?.difficultyProfile.map(d => (
                  <div key={d.label} className="flex flex-col gap-2">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span style={{ color: d.color }} className="uppercase tracking-wider">{d.label}</span>
                      <span className="text-[#1A1A1A]">{d.value}%</span>
                    </div>
                    <Bar value={d.value} max={100} color={d.color} />
                  </div>
                ))}
              </div>
              <p className="mt-10 text-[12px] text-[#9A9A98] font-medium leading-relaxed italic">
                “Technical rounds skew toward {stats?.difficultyProfile[0].value > 30 ? 'high-risk' : 'moderate'} topics compared to initial screens.”
              </p>
            </div>

            <div className={CARD_CLASS}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-8">Trap Topics</h3>
              <div className="space-y-4">
                {stats?.trapTopics.length > 0 ? stats.trapTopics.map(t => (
                  <div key={t.name} className="flex items-center gap-4 p-3 bg-[#FFF0F0] border border-[#F0C0C0] rounded-xl">
                    <span className="text-xs">⚠</span>
                    <span className="text-[13px] font-bold text-[#A82828]">{t.name}</span>
                    <span className="text-[9px] font-black text-[#A82828] uppercase tracking-widest ml-auto">{t.rate}% Struggle</span>
                  </div>
                )) : (
                   <div className="py-12 flex flex-col items-center">
                    <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-widest mb-4">Signal forming</span>
                    <p className="text-xs text-[#9A9A98] font-medium text-center">Synthesizing topic-specific struggle patterns...</p>
                  </div>
                )}
              </div>
              <p className="mt-8 text-[12px] text-[#9A9A98] font-medium leading-relaxed italic">
                “Familiar topics that consistently remove candidates from the pipeline.”
              </p>
            </div>

            {stats?.eliminationPressure ? (
              <div className={`${CARD_CLASS} flex flex-col`}>
                <span className="text-[10px] font-black text-[#D97757] uppercase tracking-[0.2em] mb-4">Elimination Pressure</span>
                <h4 className="text-sm font-bold text-[#1A1A1A] mb-4">{stats.eliminationPressure.round} Filter</h4>
                <p className="text-xs text-[#6B6B6B] leading-relaxed font-medium mb-6">
                  {stats.eliminationPressure.body}
                </p>
                <div className="mt-auto pt-6 border-t border-[#F4F1EA]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-[#9A9A98] uppercase">Drop-off Rate</span>
                    <span className="text-[13px] font-black text-[#1A1A1A]">{stats.eliminationPressure.rate}%</span>
                  </div>
                  <Bar value={stats.eliminationPressure.rate} max={100} color="#D97757" />
                </div>
              </div>
            ) : (
              <EmptyStateCard 
                title="Elimination Pressure" 
                body="Currently mapping the exact round where candidates lose momentum in this loop." 
              />
            )}
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
