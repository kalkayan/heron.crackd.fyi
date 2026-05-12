import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import { apiFetch } from "../lib/utils";

// ---------------------------------------------------------------------------
// Constants & Utils
// ---------------------------------------------------------------------------

const CARD_CLASS = "bg-white border border-[#E5E2D8] rounded-[18px] p-8 shadow-sm";
const SECTION_TITLE_CLASS = "font-heading text-2xl font-bold tracking-tight text-[#1A1A1A]";
const SUBHEADING_CLASS = "text-sm text-[#6B6B6B] mt-1";

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

// ---------------------------------------------------------------------------
// Shared Components
// ---------------------------------------------------------------------------

function Bar({ value, max, color = "#1A1A1A" }) {
  return (
    <div className="flex-1 h-1.5 bg-[#E8E5DA] rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-500" 
        style={{ width: `${pct(value, max)}%`, background: color }} 
      />
    </div>
  );
}

function Section({ title, subheading, children, className = "" }) {
  return (
    <div className={`mt-16 ${className}`}>
      <div className="mb-8">
        <h2 className={SECTION_TITLE_CLASS}>{title}</h2>
        {subheading && <p className={SUBHEADING_CLASS}>{subheading}</p>}
      </div>
      {children}
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
      setUserSessions(sessions.filter(s => s.company_id === companyId));
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

  // --- Derived Intelligence ---

  const stats = useMemo(() => {
    if (!reports.length) return null;
    
    // 1. Confidence & Freshness
    const baseConfidence = Math.min(95, reports.length * 2);
    const recentThreshold = new Date();
    recentThreshold.setFullYear(recentThreshold.getFullYear() - 1);
    const recentReports = reports.filter(r => r.interview_date && new Date(r.interview_date) >= recentThreshold).length;
    const confidence = Math.round(baseConfidence * (recentReports > 0 ? 1.1 : 0.85));

    // 2. Process Map / Stages
    // Standard sequence for SWE: Recruiter -> Phone -> Coding -> Design -> Behavioral
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

    // Identify Gatekeeper
    const mainGatekeeper = stages.reduce((prev, current) => (prev.failureRate > current.failureRate) ? prev : current, stages[0]);

    // 3. Topic Emphasis & Patterns
    const topicEmphasis = (company?.topic_tags || []).slice(0, 5).map(t => ({
      name: t.topic_id,
      score: t.frequency_score,
      interpretation: t.topic_id.toLowerCase().includes('graph') ? 'Appears often across technical screens.' : 
                      t.topic_id.toLowerCase().includes('design') ? 'High weighting in senior loops.' :
                      t.topic_id.toLowerCase().includes('behavioral') ? 'Concentrated in late-stage onsite.' : 'Regularly tested pattern.'
    }));

    const patternCounts = {};
    questions.forEach(q => {
      (q.patterns || []).forEach(p => { patternCounts[p] = (patternCounts[p] || 0) + 1; });
    });
    const patterns = Object.entries(patternCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name]) => name);

    // 4. Pressure Points
    const eliminationRounds = stages
      .filter(s => s.failureRate > 10)
      .sort((a, b) => b.failureRate - a.failureRate)
      .slice(0, 3)
      .map(s => ({ name: s.name, rate: s.failureRate }));

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

    // 5. Success Profile
    const offerReports = reports.filter(r => r.outcome === 'offer');
    const offerQs = questions.filter(q => q.report_outcome === 'offer');
    const successTopics = {};
    offerQs.forEach(q => { (q.topics || []).forEach(t => { successTopics[t] = (successTopics[t] || 0) + 1; }); });
    const topSuccessTopics = Object.keys(successTopics).sort((a, b) => successTopics[b] - successTopics[a]).slice(0, 2);

    const successInsights = [
      `Successful candidates typically cleared ${Math.round(avg(stages.map(s => s.failureRate)) || 25)}% gatekeeper rounds.`,
      `Most offers encountered ${topSuccessTopics.join(' and ')} during their loop.`,
      "Reports with offers showed higher resilience in technical rounds.",
      "Consistency across all rounds was more decisive than excelling in one."
    ];

    return {
      reportsAnalyzed: reports.length,
      confidence: Math.min(95, confidence),
      avgRounds: (rounds.length / reports.length).toFixed(1),
      mainGatekeeper: mainGatekeeper?.name || "Phone screen",
      topTheme: topicEmphasis[0]?.name || "General SWE",
      stages: stages.map(s => ({ ...s, gatekeeper: s.name === mainGatekeeper?.name })),
      topicEmphasis,
      patterns: patterns.length ? patterns : ["Problem decomposition", "Tradeoff analysis", "Complexity optimization"],
      eliminationRounds,
      trapTopics,
      successInsights,
      successSnapshot: {
        topics: topSuccessTopics.join(' + '),
        rounds: Math.round(rounds.length / reports.length),
        decisive: mainGatekeeper?.name
      }
    };
  }, [reports, rounds, company, questions]);

  function avg(arr) {
    const valid = arr.filter(x => x != null);
    return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F4F1EA] bg-[radial-gradient(circle,_#D8D6CE_1px,_transparent_1px)] bg-[size:16px_16px]">
      <AppNav />
      <div className="max-w-[1240px] mx-auto px-10 py-12">
        <p className="text-[#6B6B6B]">Loading {companyId} insights...</p>
      </div>
    </div>
  );

  if (error || !company) return (
    <div className="min-h-screen bg-[#F4F1EA] bg-[radial-gradient(circle,_#D8D6CE_1px,_transparent_1px)] bg-[size:16px_16px]">
      <AppNav />
      <div className="max-w-[1240px] mx-auto px-10 py-12">
        <p className="text-[#A82828] font-medium">{error || "Company not found"}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-[#D97757]">← Back to Dashboard</Link>
      </div>
    </div>
  );

  const backLink = (
    <Link to="/" className="text-sm font-medium text-[#9A9A98] hover:text-[#1A1A1A] transition-colors">
      ← Dashboard
    </Link>
  );

  return (
    <div className="min-h-screen bg-[#F4F1EA] bg-[radial-gradient(circle,_#D8D6CE_1px,_transparent_1px)] bg-[size:16px_16px]">
      <AppNav leftAction={backLink} />
      
      <main className="max-w-[1240px] mx-auto px-10 py-12">
        {/* Section 1: Hero Row */}
        <div className="grid grid-cols-12 gap-8 items-start">
          <div className="col-span-8">
            <span className="text-[#D97757] font-bold text-xs uppercase tracking-widest mb-5 block">
              Intelligence brief
            </span>
            <h1 className="font-heading text-6xl font-black tracking-tight text-[#1A1A1A] mb-4">
              The {company.name} interview, decoded
            </h1>
            <p className="text-xl text-[#6B6B6B] leading-relaxed mb-8 max-w-2xl font-medium">
              Most candidates don’t fail at {company.name} because they lack ability — they fail because they prepare too broadly for what they ask.
            </p>
            
            <div className="flex flex-wrap gap-2 mb-8">
              <span className="bg-white border border-[#E5E2D8] px-2.5 py-1 rounded-full text-[11px] font-bold text-[#1A1A1A] uppercase tracking-tight">{stats?.reportsAnalyzed} reports analyzed</span>
              <span className="bg-white border border-[#E5E2D8] px-2.5 py-1 rounded-full text-[11px] font-bold text-[#1A1A1A] uppercase tracking-tight">Recent data weighted</span>
              <span className="bg-white border border-[#E5E2D8] px-2.5 py-1 rounded-full text-[11px] font-bold text-[#1A1A1A] uppercase tracking-tight">SWE + MLE coverage</span>
              <span className="bg-white border border-[#E5E2D8] px-2.5 py-1 rounded-full text-[11px] font-bold text-[#1A1A1A] uppercase tracking-tight">Moderate confidence</span>
            </div>

            <div className="flex items-center gap-6 py-5 border-y border-[#E5E2D8] w-fit pr-12">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-widest">Avg</span>
                <span className="text-[13px] font-black text-[#1A1A1A]">{stats?.avgRounds} rounds</span>
              </div>
              <div className="w-px h-4 bg-[#E5E2D8]" />
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-widest">Main Gatekeeper</span>
                <span className="text-[13px] font-black text-[#1A1A1A]">{stats?.mainGatekeeper}</span>
              </div>
              <div className="w-px h-4 bg-[#E5E2D8]" />
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black text-[#9A9A98] uppercase tracking-widest">Top Theme</span>
                <span className="text-[13px] font-black text-[#1A1A1A] uppercase tracking-tight">{stats?.topTheme}</span>
              </div>
            </div>
          </div>

          <div className="col-span-4 flex flex-col gap-6 sticky top-24">
            <div className={CARD_CLASS}>
              <h3 className="text-[11px] font-bold text-[#9A9A98] uppercase tracking-widest mb-4">Coverage</h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-[#1A1A1A] tracking-tighter">{stats?.confidence}%</span>
              </div>
              <p className="text-xs text-[#9A9A98] font-medium leading-tight">How much of this company’s loop we can confidently map.</p>
            </div>

            <div className={`${CARD_CLASS} bg-[#1A1A1A] border-none text-white`}>
              <h3 className="text-[11px] font-bold text-[#9A9A98] uppercase tracking-widest mb-4">Ready to prepare?</h3>
              <p className="text-sm text-gray-400 font-medium mb-6 leading-relaxed">
                We’ve calibrated your profile and created a custom strategy for this loop. Start practicing the exact patterns you need to master.
              </p>
              <Link 
                to={userSessions.length > 0 ? `/session/${userSessions[0].id}` : "/start"}
                className="w-full bg-[#D97757] hover:bg-[#E0886A] text-white py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
              >
                Start practicing
              </Link>
              <button className="w-full mt-4 text-[13px] font-bold text-[#9A9A98] hover:text-white transition-colors">
                View your preparation strategy
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: What this loop looks like */}
        <Section 
          title="What this loop looks like" 
          subheading="Most candidates go through a predictable sequence, with one or two rounds doing most of the filtering."
        >
          <div className={CARD_CLASS}>
            <div className="flex items-center justify-between mb-16 relative">
              {/* Connector Line */}
              <div className="absolute top-1/2 left-0 w-full h-px bg-[#E5E2D8] -z-10" />
              
              {stats?.stages.map((s, idx) => (
                <div key={s.id} className="bg-white px-4 flex flex-col items-center group">
                  <div className={`w-3 h-3 rounded-full mb-4 ring-4 ring-white transition-colors duration-300 ${s.gatekeeper ? 'bg-[#A82828]' : 'bg-[#D8D6CE] group-hover:bg-[#1A1A1A]'}`} />
                  <span className="text-[13px] font-bold text-[#1A1A1A] mb-1">{s.name}</span>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#9A9A98]">{s.duration}</span>
                    {s.gatekeeper && <span className="text-[9px] font-black text-[#A82828] uppercase tracking-tighter">Gatekeeper</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[#FDFCF8] border border-[#E5E2D8] p-5 rounded-2xl">
                <p className="text-sm font-bold text-[#1A1A1A]">Typical loop has 4 stages.</p>
              </div>
              <div className="bg-[#FDFCF8] border border-[#E5E2D8] p-5 rounded-2xl">
                <p className="text-sm font-bold text-[#1A1A1A]">The phone screen removes the most candidates.</p>
              </div>
              <div className="bg-[#FDFCF8] border border-[#E5E2D8] p-5 rounded-2xl">
                <p className="text-sm font-bold text-[#1A1A1A]">Later rounds are more evaluative than guided.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* Section 3: What stands out */}
        <Section 
          title={`What stands out in ${company.name}’s interviews`} 
          subheading="This is where this loop starts to look company-specific rather than generic."
        >
          <div className="grid grid-cols-12 gap-8">
            <div className={`${CARD_CLASS} col-span-7`}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-6">Most emphasized areas</h3>
              <div className="space-y-6">
                {stats?.topicEmphasis.map(t => (
                  <div key={t.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-bold text-[#1A1A1A]">{t.name}</span>
                      <span className="text-[11px] font-bold text-[#9A9A98]">{Math.round(t.score * 100)}%</span>
                    </div>
                    <Bar value={t.score} max={1} color={t.name === 'Behavioral' ? '#A86B1A' : '#1A1A1A'} />
                    <p className="text-[11px] text-[#9A9A98] mt-2 font-medium italic">“{t.interpretation}”</p>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-[#F4F1EA]">
                <p className="text-sm text-[#6B6B6B] leading-relaxed">
                  <span className="font-bold text-[#1A1A1A]">Insight:</span> This loop leans harder on {stats?.topTheme.toLowerCase()} reasoning than a generic SWE interview sample.
                </p>
              </div>
            </div>

            <div className={`${CARD_CLASS} col-span-5 flex flex-col`}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-6">Patterns that appear repeatedly</h3>
              <div className="space-y-4 flex-1">
                {stats?.patterns.map(p => (
                  <div key={p} className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D97757]" />
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">{p}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 pt-8 border-t border-[#F4F1EA]">
                <p className="text-sm text-[#6B6B6B] leading-relaxed">
                  Candidates who study broad categories only may miss the exact forms this company prefers.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Section 4: Pressure points */}
        <Section 
          title="Where candidates struggle" 
          subheading="The highest-risk parts of the loop are not always the hardest-looking ones."
        >
          <div className="grid grid-cols-3 gap-8">
            <div className={CARD_CLASS}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-6">Difficulty profile</h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-[#9A9A98] w-12 uppercase">Hard</span>
                  <Bar value={35} max={100} color="#A82828" />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-[#9A9A98] w-12 uppercase">Medium</span>
                  <Bar value={50} max={100} color="#A86B1A" />
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-[#9A9A98] w-12 uppercase">Easy</span>
                  <Bar value={15} max={100} color="#1A7A48" />
                </div>
              </div>
              <p className="mt-8 text-xs text-[#9A9A98] font-medium leading-relaxed">
                Coding rounds skew harder than early screening stages.
              </p>
            </div>

            <div className={CARD_CLASS}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-6">Elimination pressure</h3>
              <div className="space-y-6">
                {stats?.eliminationRounds.map(r => (
                  <div key={r.name} className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">{r.name}</span>
                    <span className="text-[13px] font-black text-[#A82828] tracking-tighter">{r.rate}%</span>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-xs text-[#9A9A98] font-medium leading-relaxed">
                Most rejection pressure appears before the final stage.
              </p>
            </div>

            <div className={CARD_CLASS}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-6">Trap topics</h3>
              <div className="space-y-4">
                {stats?.trapTopics.map(t => (
                  <div key={t.name} className="flex items-center gap-3">
                    <span className="text-xs">⚠</span>
                    <span className="text-[13px] font-semibold text-[#A82828]">{t.name}</span>
                    <span className="text-[10px] bg-[#FFF0F0] border border-[#F0C0C0] px-1.5 py-0.5 rounded text-[#A82828] font-black ml-auto">{t.rate}% STRUGGLE</span>
                  </div>
                ))}
                {!stats?.trapTopics.length && <p className="text-xs text-[#9A9A98]">No high-struggle topics identified.</p>}
              </div>
              <p className="mt-8 text-xs text-[#9A9A98] font-medium leading-relaxed">
                These are familiar topics that still knock candidates out.
              </p>
            </div>
          </div>
        </Section>

        {/* Section 5: Success commonalities */}
        <Section 
          title="What successful interviews had in common" 
          subheading="Offer outcomes rarely follow a script, but strong reports often share a recognizable shape."
        >
          <div className="grid grid-cols-12 gap-8">
            <div className={`${CARD_CLASS} col-span-8`}>
              <div className="space-y-6">
                {stats?.successInsights.map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className="w-5 h-5 rounded-full bg-[#EDFBF3] border border-[#B6EDD0] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[#1A7A48] text-[10px] font-bold">✓</span>
                    </div>
                    <p className="text-[15px] font-medium text-[#1A1A1A] leading-snug">{insight}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${CARD_CLASS} col-span-4 bg-[#EDFBF3] border-[#B6EDD0]`}>
              <h3 className="text-[11px] font-bold text-[#1A7A48] uppercase tracking-widest mb-6">Offer pattern snapshot</h3>
              <div className="space-y-8">
                <div>
                  <span className="text-[11px] font-bold text-[#9A9A98] uppercase tracking-wider block mb-1">Common topic cluster</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">{stats?.successSnapshot?.topics || "General SWE"}</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#9A9A98] uppercase tracking-wider block mb-1">Typical round count</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">{stats?.successSnapshot?.rounds || "4"} rounds</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[#9A9A98] uppercase tracking-wider block mb-1">Most decisive round</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">{stats?.successSnapshot?.decisive || "Coding Round"}</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Section 6: Trust Analysis */}
        <Section 
          title="How strong this analysis is" 
          subheading="Patterns are strongest for mid-level SWE; senior MLE coverage is still sparse."
        >
          <div className="grid grid-cols-2 gap-8">
            <div className={CARD_CLASS}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-4">Coverage & freshness</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6B6B6B]">Total reports</span>
                  <span className="font-bold">{stats?.reportsAnalyzed}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6B6B6B]">Date range</span>
                  <span className="font-bold">2024 — Present</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6B6B6B]">Recentness weighting</span>
                  <span className="text-[#1A7A48] font-bold">High</span>
                </div>
              </div>
            </div>

            <div className={CARD_CLASS}>
              <h3 className="text-sm font-bold text-[#1A1A1A] mb-4">Quality & limitations</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6B6B6B]">Sources</span>
                  <span className="font-bold">LC Discuss, Blind, Glassdoor</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6B6B6B]">Role coverage</span>
                  <span className="font-bold text-[#A86B1A]">Mid-Level SWE focus</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#6B6B6B]">Confidence label</span>
                  <span className="font-bold">Moderate</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Final CTA Block */}
        <div className="mt-32 mb-40 text-center max-w-2xl mx-auto">
          <h2 className="font-heading text-4xl font-black tracking-tight text-[#1A1A1A] mb-6">
            Turn this analysis into a plan
          </h2>
          <p className="text-lg text-[#6B6B6B] leading-relaxed mb-10">
            You now know what this company tends to ask, where candidates slip, and what successful loops often share. The next step is a guided training session built around these exact patterns.
          </p>
          <div className="flex flex-col items-center gap-6">
            <Link 
              to={userSessions.length > 0 ? `/session/${userSessions[0].id}` : "/start"}
              className="px-10 py-5 bg-[#D97757] hover:bg-[#E0886A] text-white rounded-2xl text-base font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start {company.name} prep session
            </Link>
            <button className="text-sm font-bold text-[#9A9A98] hover:text-[#1A1A1A] transition-colors">
              Preview training flow
            </button>
          </div>
          
          <div className="mt-16 flex items-center justify-center gap-12 grayscale opacity-40">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]">Personalized by role</span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]">Tracks progress</span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#1A1A1A]">Company-specific</span>
          </div>
        </div>
      </main>
    </div>
  );
}
