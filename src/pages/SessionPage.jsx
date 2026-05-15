import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { AppNav } from "../components/AppNav";
import { apiFetch } from "../lib/utils";

const TYPE_STYLE = {
  category:  { background: "#EBF2FF", color: "#2D5FA8", border: "1px solid #C0D5F5" },
  technique: { background: "#F2EDFF", color: "#5B3FA8", border: "1px solid #D0C0F5" },
  variant:   { background: "#FFF8EB", color: "#A86B1A", border: "1px solid #F0D9A0" },
};

const DIFFICULTY_STYLE = {
  foundational: { background: "#EDFBF3", color: "#1A7A48", border: "1px solid #B6EDD0" },
  intermediate: { background: "#FFF8EB", color: "#A86B1A", border: "1px solid #F0D9A0" },
  advanced:     { background: "#FFF0F0", color: "#A82828", border: "1px solid #F0C0C0" },
};

const STATUS_STYLE = {
  queued:      { background: "#F5F4F1", color: "#6B6B6B", border: "1px solid #E0DDD3" },
  in_progress: { background: "#EBF5FF", color: "#1D6FA4", border: "1px solid #BDDCF5" },
  completed:   { background: "#EDFBF3", color: "#1A7A48", border: "1px solid #B6EDD0" },
  suggested:   { background: "#FBF1ED", color: "#D97757", border: "1px solid #F0D6C7" },
  active:      { background: "#EBF5FF", color: "#1D6FA4", border: "1px solid #BDDCF5" },
  abandoned:   { background: "#F5F4F1", color: "#6B6B6B", border: "1px solid #E0DDD3" },
};

const orderedTypes = ["category", "technique", "variant"];

/** Map API confidence → bar state for SkillProgressCard */
function confidenceToState(confidence) {
  if (confidence === "high")   return "high";
  if (confidence === "medium") return "some";
  return "low"; // "low" or null (not yet assessed)
}

/** Derive "Today" items from skills with gaps (no or low confidence). */
function todayFromSkills(skills) {
  const gaps = skills.filter(s => s.confidence !== "high");
  return gaps.slice(0, 4).map((s, i) => ({
    name:     s.skill_name,
    detail:   s.difficulty || s.skill_type || "",
    priority: s.confidence === "medium" ? "med" : "high",
    current:  i === 0,
  }));
}

const RAIL_CARD = {
  background: "#F6F4ED",
  border: "1px solid #E5E2D8",
  borderRadius: 24,
  padding: "24px 24px",
};

function RailSkill({ name, detail, priority, current }) {
  const dotColor = priority === "high" ? "#D97757" : priority === "med" ? "#C8893A" : "#9A9A98";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <span style={{
        width: 18, height: 18, borderRadius: "50%",
        border: `1.5px solid ${current ? "#D97757" : dotColor}`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: 1,
      }}>
        <span style={{
          width: current ? 8 : 6, height: current ? 8 : 6,
          borderRadius: "50%",
          background: current ? "#D97757" : dotColor,
        }} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: current ? 700 : 600, color: "#1A1A1A", letterSpacing: "-0.01em" }}>
          {name}
          {current && (
            <span style={{ marginLeft: 8, fontSize: 10, color: "#D97757", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              now
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: "#9A9A98", marginTop: 3 }}>{detail}</div>
      </div>
    </div>
  );
}


function RailRow({ label, value, dot }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 12.5, color: "#1A1A1A" }}>{label}</span>
      <span style={{ fontSize: 12, color: "#6B6B6B", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}

function SkillProgressCard({ skills, company = "Stripe" }) {
  const high = skills.filter(s => s.state === "high").length;
  const some = skills.filter(s => s.state === "some").length;
  const low  = skills.filter(s => s.state === "low").length;
  const pct  = Math.round((high + some * 0.5) / skills.length * 100);
  return (
    <div style={RAIL_CARD}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Skill progress
        <span style={{ fontSize: 11, color: "#9A9A98", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
      </div>
      <div style={{ fontSize: 11.5, color: "#6B6B6B", marginTop: 6, lineHeight: 1.45 }}>
        {high} of {skills.length} {company} skills solid
      </div>
      <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 4 }}>
        {skills.map((s, i) => (
          <span key={i} title={s.name} style={{
            flex: 1,
            height: 22,
            borderRadius: 4,
            background: s.state === "high" ? "#D97757" : s.state === "some" ? "#F0D6C7" : "#E8E5DA",
            border: s.state === "low" ? "1px dashed #C8C5BB" : "0",
          }} />
        ))}
      </div>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 10.5, color: "#9A9A98" }}>
        <span>{high} solid</span>
        <span>{some} partial</span>
        <span>{low} gap</span>
      </div>
    </div>
  );
}

function TodayCard({ items }) {
  return (
    <div style={RAIL_CARD}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>Today</div>
      <div style={{ fontSize: 11.5, color: "#6B6B6B", marginTop: 6, lineHeight: 1.45 }}>Skills to practice now</div>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item) => (
          <RailSkill key={item.name} {...item} />
        ))}
      </div>
    </div>
  );
}

function CoverageCard({ pct = 0, company = "Stripe" }) {
  return (
    <div style={RAIL_CARD}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>Coverage</div>
      <div style={{ fontSize: 11.5, color: "#6B6B6B", marginTop: 6, lineHeight: 1.45 }}>
        How much of {company}'s loop you can confidently handle
      </div>
      <div style={{ marginTop: 18, display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", color: "#1A1A1A" }}>
          {pct}<span style={{ fontSize: 22, color: "#9A9A98", fontWeight: 500 }}>%</span>
        </span>
      </div>
      <div style={{ marginTop: 14, height: 6, background: "#E8E5DA", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#1A1A1A", borderRadius: 999 }} />
      </div>
    </div>
  );
}

const CONFIDENCE_DOT = {
  high:   "#1A7A48",
  medium: "#C8893A",
  low:    "#A82828",
};

function CapabilitiesCard({ capabilities }) {
  const [open, setOpen] = useState(false);
  const assessed = capabilities.filter(s => s.confidence);
  if (assessed.length === 0) return null;

  const high   = assessed.filter(s => s.confidence === "high").length;
  const medium = assessed.filter(s => s.confidence === "medium").length;
  const low    = assessed.filter(s => s.confidence === "low").length;

  return (
    <div style={RAIL_CARD}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em" }}>Capabilities</div>
          <div style={{ fontSize: 11.5, color: "#6B6B6B", marginTop: 4 }}>
            {high} solid · {medium} partial · {low} gap
          </div>
        </div>
        <span style={{
          fontSize: 18, color: "#D8D6CE",
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
          lineHeight: 1,
        }}>›</span>
      </div>

      {open && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          {assessed.map(s => (
            <div key={s.skill_id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                background: CONFIDENCE_DOT[s.confidence] || "#D8D6CE",
              }} />
              <span style={{ flex: 1, fontSize: 12.5, color: "#1A1A1A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {s.skill_name}
              </span>
              <span style={{ fontSize: 11, color: "#9A9A98", textTransform: "capitalize", flexShrink: 0 }}>
                {s.confidence}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FromClaudeCard({ text }) {
  return (
    <div style={{ ...RAIL_CARD, background: "#FBF1ED", borderColor: "#F0D6C7" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D97757", flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#D97757", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          From Claude
        </span>
      </div>
      <div style={{ marginTop: 10, fontSize: 13, color: "#3D2820", lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function CompanyLinkCard({ companyName, companyId }) {
  if (!companyId) return null;
  return (
    <Link to={`/companies/${companyId}`} style={{ textDecoration: "none" }}>
      <div 
        style={{
          ...RAIL_CARD,
          background: "#D97757",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          transition: "all 0.2s ease-in-out",
          cursor: "pointer",
          border: "none",
          padding: "20px 24px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#E0886A";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(217,119,87,0.15)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#D97757";
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>View {companyName} interview brief</span>
          <span style={{ fontSize: 18 }}>→</span>
        </div>
      </div>
    </Link>
  );
}

function Badge({ style: styleName, text, lookup }) {
  const s = lookup[styleName] || lookup[Object.keys(lookup)[0]];
  return (
    <span
      style={{
        ...s,
        display: "inline-flex",
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.02em",
        textTransform: "capitalize",
      }}
    >
      {text}
    </span>
  );
}




function buildHierarchy(plan) {
  // Index nodes by skill_id so we can resolve parent relationships
  const categoryBySkillId = {};  // skill_id → category node
  const techniqueBySkillId = {}; // skill_id → technique node
  const categories = [];         // ordered list of top-level category nodes

  // Pass 1: collect categories (preserve sequence_pos order)
  for (const item of [...plan].sort((a, b) => (a.sequence_pos ?? 0) - (b.sequence_pos ?? 0))) {
    if (item.skill_type === "category") {
      const node = { ...item, techniques: [] };
      categories.push(node);
      categoryBySkillId[item.skill_id] = node;
    }
  }

  // Pass 2: assign techniques to their parent category
  for (const item of [...plan].sort((a, b) => (a.sequence_pos ?? 0) - (b.sequence_pos ?? 0))) {
    if (item.skill_type === "technique") {
      const node = { ...item, variants: [] };
      techniqueBySkillId[item.skill_id] = node;
      const parentCat = item.parent_skill_id ? categoryBySkillId[item.parent_skill_id] : null;
      if (parentCat) {
        parentCat.techniques.push(node);
      } else {
        // Orphan technique — wrap in a synthetic category
        const orphan = {
          skill_name: item.skill_name,
          status: item.status,
          session_skill_id: `__orphan_${item.skill_id}`,
          techniques: [node],
        };
        categories.push(orphan);
      }
    }
  }

  // Pass 3: assign variants to their parent technique (or category)
  for (const item of [...plan].sort((a, b) => (a.sequence_pos ?? 0) - (b.sequence_pos ?? 0))) {
    if (item.skill_type === "variant") {
      const parentTech = item.parent_skill_id ? techniqueBySkillId[item.parent_skill_id] : null;
      if (parentTech) {
        parentTech.variants.push(item);
      } else {
        const parentCat = item.parent_skill_id ? categoryBySkillId[item.parent_skill_id] : null;
        if (parentCat) {
          parentCat.techniques.push({ skill_name: item.skill_name, variants: [item] });
        }
      }
    }
  }

  return categories;
}

function VariantRow({ variant, sessionId }) {
  return (
    <Link
      to={`/session/${sessionId}/skills/${variant.session_skill_id}`}
      style={{ textDecoration: "none" }}
    >
      <div 
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderRadius: 12,
          transition: "all 0.2s ease",
          cursor: "pointer",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = "#F9F8F4";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = "transparent";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: variant.status === "completed" ? "#1A7A48" : variant.status === "in_progress" ? "#1D6FA4" : "#D8D6CE"
          }} />
          <span style={{ fontSize: 14, fontWeight: 500, color: "#1A1A1A" }}>{variant.skill_name}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {variant.difficulty && (
            <Badge style={variant.difficulty} text={variant.difficulty} lookup={DIFFICULTY_STYLE} />
          )}
          <span style={{ fontSize: 16, color: "#D8D6CE" }}>›</span>
        </div>
      </div>
    </Link>
  );
}

function TechniqueSection({ technique, sessionId }) {
  const isLeaf = technique.variants.length === 0;

  if (isLeaf && technique.session_skill_id) {
    return (
      <Link
        to={`/session/${sessionId}/skills/${technique.session_skill_id}`}
        style={{ textDecoration: "none" }}
      >
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 16px",
            borderRadius: 12,
            background: "#F9F8F4",
            border: "1px solid #E5E2D8",
            transition: "all 0.2s ease",
            cursor: "pointer",
            margin: "0 4px"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = "#D97757";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(217,119,87,0.05)";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = "#E5E2D8";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: technique.status === "completed" ? "#1A7A48" : technique.status === "in_progress" ? "#1D6FA4" : "#D8D6CE"
            }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>{technique.skill_name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Badge style={technique.status} text={technique.status.replace("_", " ")} lookup={STATUS_STYLE} />
            <span style={{ fontSize: 18, color: "#D97757" }}>→</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ 
        padding: "8px 16px",
        fontSize: 11,
        fontWeight: 800,
        color: "#9A9A98",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        {technique.skill_name}
        <span style={{ fontWeight: 600, letterSpacing: "normal", textTransform: "none" }}>
          {technique.variants.length} {technique.variants.length === 1 ? "variant" : "variants"}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {technique.variants.map(v => (
          <VariantRow key={v.session_skill_id} variant={v} sessionId={sessionId} />
        ))}
      </div>
    </div>
  );
}

function PlanFailedCard({ sessionId, onRetry }) {
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}/plan`, { method: "POST" });
      if (resp && resp.ok) onRetry();
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div style={{ background: "#FFF8F8", border: "1px solid #F0C0C0", borderRadius: 24, padding: "28px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: "#A82828", margin: 0 }}>Plan generation failed</p>
        <p style={{ fontSize: 12, color: "#9A9A98", margin: "4px 0 0" }}>The AI hit a rate limit. Try again — it usually clears within a minute.</p>
      </div>
      <button
        onClick={handleRetry}
        disabled={retrying}
        style={{ padding: "8px 20px", background: retrying ? "#E0DDD3" : "#1A1A1A", color: "#FFFFFF", border: "none", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: retrying ? "not-allowed" : "pointer", fontFamily: "inherit", flexShrink: 0 }}
      >
        {retrying ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}

function SuggestedSkillsSection({ skills, sessionId, onActivate }) {
  const [activating, setActivating] = useState(null);

  async function handleActivate(ss) {
    setActivating(ss.session_skill_id);
    try {
      const resp = await apiFetch(
        `/api/user/sessions/${sessionId}/skills/${ss.session_skill_id}/activate`,
        { method: "POST" },
      );
      if (resp && resp.ok) {
        const data = await resp.json();
        onActivate(data.activated || [ss.session_skill_id]);
      }
    } finally {
      setActivating(null);
    }
  }

  if (skills.length === 0) return null;

  return (
    <div
      style={{
        background: "#FFFAF7",
        border: "1px solid #F0D6C7",
        borderRadius: 24,
        padding: "24px 28px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#D97757", flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "#D97757", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          AI Suggestions
        </span>
      </div>
      <p style={{ fontSize: 13, color: "#6B6B6B", margin: "0 0 18px" }}>
        Based on {skills[0]?.company_name || "this company"}'s interview patterns. Add to your plan to start practicing.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {skills.map((ss) => (
          <div
            key={ss.session_skill_id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 16px",
              background: "#FFFFFF",
              border: "1px solid #F0D6C7",
              borderRadius: 14,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A" }}>{ss.skill_name}</span>
                {ss.difficulty && (
                  <span style={{ fontSize: 11, color: "#9A9A98" }}>{ss.difficulty}</span>
                )}
              </div>
              {ss.suggestion_reason && (
                <p style={{ fontSize: 12, color: "#8A7060", margin: "4px 0 0", lineHeight: 1.45 }}>
                  {ss.suggestion_reason}
                </p>
              )}
            </div>
            <button
              onClick={() => handleActivate(ss)}
              disabled={activating === ss.session_skill_id}
              style={{
                padding: "6px 16px",
                background: activating === ss.session_skill_id ? "#F0D6C7" : "#D97757",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: activating === ss.session_skill_id ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "background 0.15s",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { if (!activating) e.currentTarget.style.background = "#C86A47"; }}
              onMouseLeave={(e) => { if (!activating) e.currentTarget.style.background = "#D97757"; }}
            >
              {activating === ss.session_skill_id ? "Adding…" : "Add to plan"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryAccordion({ category, sessionId }) {
  const [isExpanded, setIsExpanded] = useState(category.status === "in_progress");
  
  const allVariants = category.techniques.flatMap(t => t.variants);
  const useTechniquesAsUnits = allVariants.length === 0;
  
  const completedCount = useTechniquesAsUnits 
    ? category.techniques.filter(t => t.status === "completed").length
    : allVariants.filter(v => v.status === "completed").length;
    
  const totalCount = useTechniquesAsUnits ? category.techniques.length : allVariants.length;

  return (
    <article
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E2D8",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: isExpanded ? "0 8px 16px rgba(0,0,0,0.04)" : "0 1px 4px rgba(0,0,0,0.02)",
        transition: "all 0.3s ease-in-out",
        transform: isExpanded ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: "24px 28px",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
        onMouseEnter={e => {
          if (!isExpanded) {
            e.currentTarget.parentElement.style.borderColor = "#C8C5BB";
            e.currentTarget.parentElement.style.boxShadow = "0 4px 12px rgba(0,0,0,0.03)";
          }
        }}
        onMouseLeave={e => {
          if (!isExpanded) {
            e.currentTarget.parentElement.style.borderColor = "#E5E2D8";
            e.currentTarget.parentElement.style.boxShadow = "0 1px 4px rgba(0,0,0,0.02)";
          }
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <h2 style={{
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                color: "#1A1A1A",
                margin: 0,
                fontFamily: "Martel Sans, sans-serif",
              }}>
                {category.skill_name}
              </h2>
              {category.status && (
                <Badge style={category.status} text={category.status.replace("_", " ")} lookup={STATUS_STYLE} />
              )}
            </div>
            {category.description && (
              <p style={{ fontSize: 14, color: "#6B6B6B", margin: 0, lineHeight: 1.5, maxWidth: "90%" }}>
                {category.description}
              </p>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>
              {completedCount}<span style={{ color: "#D8D6CE", margin: "0 2px" }}>/</span>{totalCount}
            </div>
            <span style={{ 
              fontSize: 24, 
              color: "#D8D6CE", 
              transition: "transform 0.3s ease",
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              lineHeight: 1
            }}>›</span>
          </div>
        </div>

        {/* Technique Tags for collapsed state */}
        {!isExpanded && category.techniques.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {category.techniques.map(t => (
              <span 
                key={t.session_skill_id}
                style={{
                  padding: "4px 12px",
                  background: "#F6F4ED",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#9A9A98",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em"
                }}
              >
                {t.skill_name}
              </span>
            ))}
          </div>
        )}
      </div>

      {isExpanded && (
        <div style={{ 
          padding: "0 12px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          borderTop: "1px solid #F4F1EA",
          marginTop: -4,
          paddingTop: 20
        }}>
          {category.techniques.map(t => (
            <TechniqueSection key={t.session_skill_id} technique={t} sessionId={sessionId} />
          ))}
          {category.techniques.length === 0 && (
            <div style={{ padding: "12px 16px", fontSize: 13, color: "#9A9A98", fontStyle: "italic" }}>
              No techniques published for this category yet.
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [session, setSession] = useState(null);
  const [plan, setPlan] = useState([]);
  const [planStatus, setPlanStatus] = useState("ready");
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [meResp, sessionResp, planResp, capsResp] = await Promise.all([
          apiFetch("/api/user/auth/me"),
          apiFetch(`/api/user/sessions/${sessionId}`),
          apiFetch(`/api/user/sessions/${sessionId}/plan`),
          apiFetch(`/api/user/sessions/${sessionId}/capabilities`),
        ]);
        const [meData, sessionData, planData, capsData] = await Promise.all([
          meResp ? meResp.json() : null,
          sessionResp ? sessionResp.json() : null,
          planResp ? planResp.json() : null,
          capsResp ? capsResp.json() : null,
        ]);
        setEmail(meData?.email || "");
        setSession(sessionData);
        setPlan(planData?.plan || []);
        setPlanStatus(planData?.plan_status || "ready");
        setCapabilities(capsData?.skills || []);
      } catch {
        setError("Unable to load this session.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  // Poll for plan updates while AI generation is in progress
  useEffect(() => {
    if (planStatus !== "generating") return;
    const interval = setInterval(async () => {
      try {
        const resp = await apiFetch(`/api/user/sessions/${sessionId}/plan`);
        if (!resp) return;
        const data = await resp.json();
        setPlan(data.plan || []);
        setPlanStatus(data.plan_status || "ready");
      } catch { /* ignore poll errors */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [planStatus, sessionId]);

  // Split plan into active (queued/in_progress/completed) and suggested
  const activePlan = useMemo(() => plan.filter(s => s.status !== "suggested"), [plan]);
  const suggestedPlan = useMemo(() => {
    const suggested = plan.filter(s => s.status === "suggested");
    // Don't show a category card if any of its child techniques are also suggested
    const suggestedParentIds = new Set(suggested.map(s => s.parent_skill_id).filter(Boolean));
    return suggested.filter(s => !(s.skill_type === "category" && suggestedParentIds.has(s.skill_id)));
  }, [plan]);
  const hierarchicalPlan = useMemo(() => buildHierarchy(activePlan), [activePlan]);

  function handleSkillActivated(activatedIds) {
    const ids = new Set(Array.isArray(activatedIds) ? activatedIds : [activatedIds]);
    setPlan(prev => prev.map(s =>
      ids.has(s.session_skill_id) ? { ...s, status: "queued" } : s
    ));
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch("/api/user/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("crackd_user_token");
      navigate("/", { replace: true });
      setLoggingOut(false);
    }
  }

  async function handleAbandon() {
    setAbandoning(true);
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "abandoned" }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Unable to update session."); return; }
      navigate("/dashboard", { replace: true });
    } catch {
      setError("Unable to update session.");
    } finally {
      setAbandoning(false);
    }
  }

  async function handleResume() {
    setResuming(true);
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Unable to update session."); return; }
      setSession((prev) => prev ? { ...prev, status: data.status } : prev);
    } catch {
      setError("Unable to update session.");
    } finally {
      setResuming(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this session? This will remove the study plan and session history.")) return;
    setDeleting(true);
    try {
      const resp = await apiFetch(`/api/user/sessions/${sessionId}`, { method: "DELETE" });
      const data = await resp.json();
      if (!resp.ok) { setError(data.error || "Unable to delete session."); return; }
      navigate("/dashboard?from=session", { replace: true });
    } catch {
      setError("Unable to delete session.");
    } finally {
      setDeleting(false);
    }
  }

  const isActive = session?.status === "active";

  const backLink = (
    <Link
      to="/dashboard?from=session"
      style={{ fontSize: 13, color: "#9A9A98", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#1A1A1A")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#9A9A98")}
    >
      Dashboard
    </Link>
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <AppNav email={email} onLogout={handleLogout} loggingOut={loggingOut} leftAction={backLink} />

      <main style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 40px 80px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "40vh" }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "2px solid #E0DDD3",
                borderTopColor: "#1A1A1A",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : error ? (
          <p style={{ fontSize: 13, color: "#C0392B" }}>{error}</p>
        ) : session ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>

            {/* Left: header + skill plan */}
            <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
            {/* Page header */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginTop: 24 }}>
                  <span style={{ color: "#D97757", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: 12, display: "block" }}>
                    Personalized Plan
                  </span>

                  <h1
                    style={{
                      fontSize: "clamp(32px, 5vw, 56px)",
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      color: "#1A1A1A",
                      fontFamily: "Martel Sans, sans-serif",
                      lineHeight: 1.05,
                      maxWidth: 800,
                    }}
                  >
                    A strategy built for you to master {session.company_name}
                  </h1>
                </div>

                <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                  {session.timeline_weeks && (
                    <span style={{ fontSize: 13, color: "#6B6B6B", fontWeight: 500 }}>
                      {session.timeline_weeks} weeks
                    </span>
                  )}
                  <span
                    style={{
                      display: "inline-flex",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "capitalize",
                      ...(STATUS_STYLE[session.status] || STATUS_STYLE.queued),
                    }}
                  >
                    {session.status}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={isActive ? handleAbandon : handleResume}
                  disabled={abandoning || resuming || deleting}
                  style={{
                    background: "none",
                    border: "1px solid #E0DDD3",
                    borderRadius: 999,
                    padding: "8px 18px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#1A1A1A",
                    cursor: (abandoning || resuming || deleting) ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: (abandoning || resuming || deleting) ? 0.5 : 1,
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!abandoning && !resuming) e.currentTarget.style.borderColor = "#9A9A98"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E0DDD3"; }}
                >
                  {isActive
                    ? (abandoning ? "Abandoning…" : "Abandon session")
                    : (resuming ? "Resuming…" : "Resume session")}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    background: "none",
                    border: "1px solid #F0C0C0",
                    borderRadius: 999,
                    padding: "8px 18px",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#A82828",
                    cursor: deleting ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    opacity: deleting ? 0.5 : 1,
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.background = "#FFF0F0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  {deleting ? "Deleting…" : "Delete session"}
                </button>
              </div>
            </div>

            {/* Hierarchical Skill plan */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {hierarchicalPlan.map((category) => (
                <CategoryAccordion
                  key={category.session_skill_id}
                  category={category}
                  sessionId={sessionId}
                />
              ))}

              {/* AI Suggestions */}
              <SuggestedSkillsSection
                skills={suggestedPlan}
                sessionId={sessionId}
                onActivate={handleSkillActivated}
              />

              {/* Generating state */}
              {planStatus === "generating" && (
                <div style={{ background: "#FFFAF7", border: "1px dashed #F0D6C7", borderRadius: 24, padding: "28px 24px", display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid #F0D6C7", borderTopColor: "#D97757", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#D97757", margin: 0 }}>Building your plan…</p>
                    <p style={{ fontSize: 12, color: "#9A9A98", margin: "4px 0 0" }}>AI is analysing {session.company_name}'s interview patterns for you.</p>
                  </div>
                </div>
              )}

              {/* Failed state */}
              {planStatus === "failed" && <PlanFailedCard sessionId={sessionId} onRetry={() => setPlanStatus("generating")} />}

              {/* Empty state (plan ready, no skills at all) */}
              {planStatus === "ready" && hierarchicalPlan.length === 0 && suggestedPlan.length === 0 && (
                <div style={{ background: "#FFFFFF", border: "1px solid #E5E2D8", borderRadius: 24, padding: "48px 24px", textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.02)" }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: "#9A9A98", margin: 0 }}>No skills in this plan yet.</p>
                  <p style={{ fontSize: 13, color: "#D8D6CE", marginTop: 8 }}>We're mapping {session.company_name}'s patterns — check back shortly.</p>
                </div>
              )}
            </div>

            </div>{/* end left col */}

            {/* Right: stats sidebar */}
            {(() => {
              const skillBars = capabilities.map(s => ({ name: s.skill_name, state: confidenceToState(s.confidence) }));
              const todayItems = todayFromSkills(capabilities);
              const highCount = skillBars.filter(s => s.state === "high").length;
              const capPct = skillBars.length ? Math.round((highCount / skillBars.length) * 100) : 0;
              const firstGap = capabilities.find(s => s.confidence !== "high");
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "sticky", top: 72 }}>
                  <CompanyLinkCard companyName={session.company_name} companyId={session.company_id} />
                  {skillBars.length > 0 && (
                    <SkillProgressCard skills={skillBars} company={session.company_name} />
                  )}
                  {todayItems.length > 0 && (
                    <TodayCard items={todayItems} />
                  )}
                  <CoverageCard pct={capPct} company={session.company_name} />
                  <CapabilitiesCard capabilities={capabilities} />
                  {firstGap && (
                    <FromClaudeCard text={`Focus on ${firstGap.skill_name} first — it's your biggest gap for ${session.company_name}.`} />
                  )}
                </div>
              );
            })()}

          </div>
        ) : null}
      </main>
    </div>
  );
}

