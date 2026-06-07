import { useState, useEffect, useRef } from "react";
import "./App.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "thesis_intro_maker_v2";

const STAGE_NAMES = [
  "Topic Exploration",
  "Main Idea",
  "Method",
  "Significance",
  "Generate Introduction",
  "Instructor Feedback",
  "Revision",
];

const STAGE_DESCS = [
  "Explore your research topic. The AI will generate a tentative title and summary — or ask focused follow-up questions if more detail is needed.",
  "Share rough thoughts about what you want to argue. The AI will organize them into a clear main idea (no full introduction yet).",
  "Select your research methods and describe how you will use them. The AI will draft a formal methods declaration.",
  "Explain why your research matters. The AI will shape this into a formal purpose and significance statement.",
  "Review your approved outputs from all previous stages, then generate your complete academic introduction.",
  "Paste your instructor's feedback on the introduction. Then continue to the revision stage.",
  "Review your instructor's comments and generate a revised introduction that addresses all feedback.",
];

const GENERATE_LABELS = [
  "Generate Title & Summary",
  "Organize Main Idea",
  "Summarize Methods",
  "Draft Significance Statement",
  "Generate Introduction",
  "",
  "Generate Revision",
];

const METHOD_OPTIONS = [
  { key: "libraryResearch", label: "Library Research" },
  { key: "survey",          label: "Survey" },
  { key: "interview",       label: "Interview" },
  { key: "observation",     label: "Observation" },
  { key: "contentAnalysis", label: "Content Analysis" },
  { key: "other",           label: "Other" },
];

// ─── Initial State ────────────────────────────────────────────────────────────

function makeInitialState() {
  return {
    currentStage: 0,
    stages: [
      // 0 – Topic Exploration
      { generalTopic: "", keywords: "", whyInterested: "", extraThoughts: "", showExtra: false, aiOutput: "", approved: false },
      // 1 – Main Idea
      { roughThoughts: "", extraThoughts: "", showExtra: false, aiOutput: "", approved: false },
      // 2 – Method
      {
        methods: { libraryResearch: false, survey: false, interview: false, observation: false, contentAnalysis: false, other: false },
        otherMethod: "", additionalDetails: "",
        extraThoughts: "", showExtra: false, aiOutput: "", approved: false,
      },
      // 3 – Significance
      { whyMatters: "", extraThoughts: "", showExtra: false, aiOutput: "", approved: false },
      // 4 – Generate Introduction
      { extraThoughts: "", showExtra: false, aiOutput: "", approved: false },
      // 5 – Instructor Feedback
      { instructorFeedback: "" },
      // 6 – Revision
      { extraThoughts: "", showExtra: false, aiOutput: "", approved: false },
    ],
  };
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function callChat(messages) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const data = await res.json();
  return data.message.content;
}

// ─── Prompts ──────────────────────────────────────────────────────────────────

function buildMessages(stageIndex, stages) {
  const s = stages[stageIndex];
  const extra = s.extraThoughts ? `\nAdditional thoughts from student: ${s.extraThoughts}` : "";

  switch (stageIndex) {
    case 0:
      return [
        {
          role: "system",
          content: `You are an academic writing assistant helping a student develop a thesis research topic.

Evaluate whether the student's input is specific enough. If it is too vague — for example a single broad word, no clear direction, or missing focus — respond ONLY with 1–2 focused follow-up questions. Do not generate a title or summary yet.

If the input is sufficiently specific, respond using exactly this format:
TITLE: [tentative academic thesis title]
SUMMARY: [2–3 sentence overview of what the research will examine and why]

Use formal academic language suitable for an undergraduate or graduate thesis.`,
        },
        {
          role: "user",
          content: `General topic: ${s.generalTopic}\nKeywords / related words: ${s.keywords}\nWhy interested: ${s.whyInterested}${extra}`,
        },
      ];

    case 1: {
      const ctx = stages[0]?.aiOutput ? `\nApproved topic context:\n${stages[0].aiOutput}` : "";
      return [
        {
          role: "system",
          content: `You are an academic writing assistant. Organize the student's rough thoughts into a clear, focused main idea statement (2–4 sentences). Do NOT write a full introduction. Do NOT add claims the student hasn't made. Only clarify and structure what they have written.${ctx}`,
        },
        {
          role: "user",
          content: `Rough thoughts about what I want to say:\n${s.roughThoughts}${extra}`,
        },
      ];
    }

    case 2: {
      const selected = METHOD_OPTIONS
        .filter(({ key }) => s.methods[key])
        .map(({ key, label }) => key === "other" ? `Other (${s.otherMethod || "unspecified"})` : label)
        .join(", ");
      return [
        {
          role: "system",
          content: `You are an academic writing assistant. Write a formal 3–5 sentence declaration of the student's planned research methods. Begin with "This study will…" or equivalent. Be specific about what each method will be used to investigate or collect. Write in formal academic English.`,
        },
        {
          role: "user",
          content: `Selected methods: ${selected || "none specified"}\nMethod details: ${s.additionalDetails || "none provided"}${extra}`,
        },
      ];
    }

    case 3: {
      const ctx = stages[0]?.aiOutput ? `\nResearch context:\n${stages[0].aiOutput}` : "";
      return [
        {
          role: "system",
          content: `You are an academic writing assistant. Transform the student's explanation into a formal academic purpose and significance statement (3–5 sentences). Address: (1) the gap or problem this research responds to, (2) who benefits and how, (3) broader academic or societal value.${ctx}`,
        },
        {
          role: "user",
          content: `Why I think this research matters:\n${s.whyMatters}${extra}`,
        },
      ];
    }

    case 4:
      return [
        {
          role: "system",
          content: `You are an academic writing assistant. Write a complete, well-structured academic introduction (300–500 words, 3–4 paragraphs) from the student's approved research components. The introduction must: (1) open by situating the research topic in context, (2) identify the problem or gap in existing knowledge, (3) state the research focus and main argument, (4) briefly describe the methodology, (5) explain the study's significance. Write in formal academic English.`,
        },
        {
          role: "user",
          content: `Topic & Title/Summary:\n${stages[0]?.aiOutput || "Not provided"}\n\nMain Idea:\n${stages[1]?.aiOutput || "Not provided"}\n\nResearch Methods:\n${stages[2]?.aiOutput || "Not provided"}\n\nPurpose & Significance:\n${stages[3]?.aiOutput || "Not provided"}${extra}`,
        },
      ];

    case 6:
      return [
        {
          role: "system",
          content: `You are an academic writing assistant. Rewrite the student's thesis introduction based on the instructor's feedback. Address every point raised. Maintain formal academic tone and keep a similar length unless the feedback requests otherwise.`,
        },
        {
          role: "user",
          content: `Original introduction:\n${stages[4]?.aiOutput || ""}\n\nInstructor feedback:\n${stages[5]?.instructorFeedback || ""}${extra}`,
        },
      ];

    default:
      return [];
  }
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportJSON(state) {
  const blob = new Blob(
    [JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)],
    { type: "application/json" }
  );
  triggerDownload(blob, "thesis-intro-v2.json");
}

function exportHTML(stages) {
  const sections = STAGE_NAMES.map((name, i) => {
    const output = stages[i]?.aiOutput;
    if (!output) return "";
    return `<section><h2>${i + 1}. ${name}</h2><p>${output.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p></section>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thesis Introduction — ${new Date().toLocaleDateString()}</title>
  <style>
    body{font-family:Georgia,serif;max-width:800px;margin:60px auto;line-height:1.8;color:#2c3e50;padding:0 20px}
    h1{color:#1a2b4a;border-bottom:3px solid #1a2b4a;padding-bottom:12px}
    h2{color:#2980b9;margin-top:40px}
    section{margin-bottom:30px;padding:20px 24px;background:#f8f9fa;border-left:4px solid #2980b9;border-radius:0 6px 6px 0}
    p{margin:0 0 12px}
    .meta{color:#7f8c8d;font-size:.9em;margin-bottom:40px}
  </style>
</head>
<body>
  <h1>Thesis Introduction Maker V2</h1>
  <p class="meta">Exported on ${new Date().toLocaleString()}</p>
  ${sections}
</body>
</html>`;

  triggerDownload(new Blob([html], { type: "text/html" }), "thesis-intro-v2.html");
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Import ───────────────────────────────────────────────────────────────────

function hasCurrentWork(state) {
  return state.stages.some((s, i) => {
    if (i === 5) return !!s.instructorFeedback;
    return s.aiOutput || s.approved ||
      s.generalTopic || s.keywords || s.whyInterested ||
      s.roughThoughts || s.whyMatters || s.additionalDetails;
  });
}

function validateImport(data) {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("File is not a valid JSON object.");
  if (!Array.isArray(data.stages) || data.stages.length !== 7)
    throw new Error("This file does not appear to be a Thesis Introduction Maker save file (expected 7 stages).");
  if (typeof data.currentStage !== "number")
    throw new Error("This file does not appear to be a Thesis Introduction Maker save file (missing currentStage).");
  if (typeof data.stages[0]?.generalTopic !== "string")
    throw new Error("This file does not appear to be a Thesis Introduction Maker save file (invalid Stage 1 data).");
  if (typeof data.stages[5]?.instructorFeedback !== "string")
    throw new Error("This file does not appear to be a Thesis Introduction Maker save file (invalid Stage 6 data).");
}

function normalizeImport(data) {
  const initial = makeInitialState();
  return {
    currentStage: Math.min(Math.max(Math.floor(data.currentStage), 0), 6),
    stages: initial.stages.map((defaultStage, i) => ({
      ...defaultStage,
      ...(data.stages[i] || {}),
      showExtra: false,
      extraThoughts: "",
    })),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ currentStage, stages, onNavigate }) {
  return (
    <nav className="progress-bar" aria-label="Stage progress">
      {STAGE_NAMES.map((name, i) => {
        const s = stages[i];
        const done = i === 5 ? !!s?.instructorFeedback : !!s?.approved;
        const active = i === currentStage;
        const accessible = i <= currentStage;
        return (
          <button
            key={i}
            className={`step${active ? " step--active" : ""}${done ? " step--done" : ""}${accessible ? " step--accessible" : ""}`}
            onClick={() => accessible && onNavigate(i)}
            disabled={!accessible}
            aria-current={active ? "step" : undefined}
          >
            <span className="step__num">{done ? "✓" : i + 1}</span>
            <span className="step__label">{name}</span>
          </button>
        );
      })}
    </nav>
  );
}

function ApprovedSummary({ stages }) {
  const [open, setOpen] = useState(false);
  const items = stages
    .map((s, i) => ({ name: STAGE_NAMES[i], output: s.aiOutput, approved: s.approved, i }))
    .filter(({ output, approved, i }) => output && approved && i !== 5);

  if (!items.length) return null;

  return (
    <div className="approved-summary">
      <button className="approved-summary__toggle" onClick={() => setOpen(o => !o)}>
        <span>{open ? "▲" : "▼"}</span>
        <span>Approved Outputs ({items.length} of {STAGE_NAMES.length - 1})</span>
      </button>
      {open && (
        <div className="approved-summary__body">
          {items.map(({ name, output, i }) => (
            <div key={i} className="approved-summary__item">
              <div className="approved-summary__label">{name}</div>
              <div className="approved-summary__text">{output}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AIOutputBox({ text, loading }) {
  if (loading) return <div className="ai-output ai-output--loading">Generating… please wait.</div>;
  if (!text) return null;
  return (
    <div className="ai-output">
      <div className="ai-output__label">AI Output</div>
      <div className="ai-output__text">{text}</div>
    </div>
  );
}

// ─── Stage Input Panels ───────────────────────────────────────────────────────

function Stage0Inputs({ s, update, disabled }) {
  return (
    <div className="stage-fields">
      <div className="field">
        <label>General Topic</label>
        <input
          type="text"
          value={s.generalTopic}
          onChange={e => update({ generalTopic: e.target.value })}
          placeholder="e.g. Social media and teenage mental health"
          disabled={disabled}
        />
      </div>
      <div className="field">
        <label>Keywords / Related Words</label>
        <input
          type="text"
          value={s.keywords}
          onChange={e => update({ keywords: e.target.value })}
          placeholder="e.g. anxiety, Instagram, screen time, adolescents"
          disabled={disabled}
        />
      </div>
      <div className="field">
        <label>Why are you interested in this topic?</label>
        <textarea
          rows={4}
          value={s.whyInterested}
          onChange={e => update({ whyInterested: e.target.value })}
          placeholder="Explain what drew you to this subject and what you hope to find out."
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function Stage1Inputs({ s, update, disabled }) {
  return (
    <div className="stage-fields">
      <div className="field">
        <label>Rough thoughts about what you want to say</label>
        <textarea
          rows={6}
          value={s.roughThoughts}
          onChange={e => update({ roughThoughts: e.target.value })}
          placeholder="Write freely. What is your main argument or point? What do you think the study will show? Don't worry about grammar or structure yet."
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function Stage2Inputs({ s, update, disabled }) {
  const toggle = (key) => update({ methods: { ...s.methods, [key]: !s.methods[key] } });
  return (
    <div className="stage-fields">
      <div className="field">
        <label>Research Methods (select all that apply)</label>
        <div className="checkbox-group">
          {METHOD_OPTIONS.map(({ key, label }) => (
            <label key={key} className="checkbox-label">
              <input type="checkbox" checked={s.methods[key]} onChange={() => toggle(key)} disabled={disabled} />
              {label}
            </label>
          ))}
        </div>
      </div>
      {s.methods.other && (
        <div className="field">
          <label>What other method or data source will you use?</label>
          <input
            type="text"
            value={s.otherMethod}
            onChange={e => update({ otherMethod: e.target.value })}
            placeholder="Describe your other method or data source"
            disabled={disabled}
          />
        </div>
      )}
      <div className="field">
        <label>Additional method details</label>
        <textarea
          rows={4}
          value={s.additionalDetails}
          onChange={e => update({ additionalDetails: e.target.value })}
          placeholder="How will you use these methods? What will you be studying or measuring?"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function Stage3Inputs({ s, update, disabled }) {
  return (
    <div className="stage-fields">
      <div className="field">
        <label>Why do you think this research matters?</label>
        <textarea
          rows={6}
          value={s.whyMatters}
          onChange={e => update({ whyMatters: e.target.value })}
          placeholder="Who will benefit from this research? What problem does it address? What gap in knowledge does it fill?"
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function Stage4Inputs() {
  return (
    <p className="stage-note">
      The introduction will be generated automatically from your approved outputs in Stages 1–4. Click Generate Introduction when ready.
    </p>
  );
}

function Stage5Inputs({ s, update, approvedIntro }) {
  return (
    <div className="stage-fields">
      <div className="field">
        <label>Current Introduction</label>
        <div className="intro-display">
          {approvedIntro || <em className="text-muted">No introduction generated yet.</em>}
        </div>
      </div>
      <div className="field">
        <label>Instructor Feedback</label>
        <textarea
          rows={6}
          value={s.instructorFeedback}
          onChange={e => update({ instructorFeedback: e.target.value })}
          placeholder="Paste or type your instructor's comments here."
        />
      </div>
    </div>
  );
}

function Stage6Inputs() {
  return (
    <p className="stage-note">
      The revised introduction will be generated using your original introduction and instructor feedback. Click Generate Revision when ready.
    </p>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : makeInitialState();
    } catch {
      return makeInitialState();
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [importMessage, setImportMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (importMessage?.type !== "success") return;
    const t = setTimeout(() => setImportMessage(null), 4000);
    return () => clearTimeout(t);
  }, [importMessage]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const { currentStage, stages } = state;
  const s = stages[currentStage];

  function updateStage(i, updates) {
    setState(prev => ({
      ...prev,
      stages: prev.stages.map((st, idx) => (idx === i ? { ...st, ...updates } : st)),
    }));
  }

  function goTo(i) {
    setState(prev => ({ ...prev, currentStage: i }));
    setError("");
  }

  async function handleGenerate() {
    setLoading(true);
    setError("");
    try {
      const messages = buildMessages(currentStage, stages);
      const output = await callChat(messages);
      updateStage(currentStage, { aiOutput: output, showExtra: false, extraThoughts: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleApprove() {
    updateStage(currentStage, { approved: true });
    if (currentStage < STAGE_NAMES.length - 1) goTo(currentStage + 1);
  }

  function handleRevise() {
    updateStage(currentStage, { aiOutput: "", extraThoughts: "", showExtra: false, approved: false });
    setError("");
  }

  function handleAddMore() {
    updateStage(currentStage, { showExtra: true });
  }

  function handleStage5Continue() {
    if (!stages[5].instructorFeedback.trim()) {
      setError("Please enter the instructor's feedback before continuing.");
      return;
    }
    goTo(6);
  }

  function handleReset() {
    setState(makeInitialState());
    setShowReset(false);
    setError("");
  }

  function handleImportClick() {
    setImportMessage(null);
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        validateImport(data);
        const normalized = normalizeImport(data);
        if (hasCurrentWork(state)) {
          setPendingImport(normalized);
        } else {
          applyImport(normalized);
        }
      } catch (err) {
        setImportMessage({ type: "error", text: err.message });
      }
    };
    reader.onerror = () => setImportMessage({ type: "error", text: "Could not read the file." });
    reader.readAsText(file);
  }

  function applyImport(normalized) {
    setState(normalized);
    setPendingImport(null);
    setError("");
    setImportMessage({ type: "success", text: "Previous work imported successfully." });
  }

  function renderInputs() {
    const update = (u) => updateStage(currentStage, u);
    const disabled = s.approved;
    switch (currentStage) {
      case 0: return <Stage0Inputs s={s} update={update} disabled={disabled} />;
      case 1: return <Stage1Inputs s={s} update={update} disabled={disabled} />;
      case 2: return <Stage2Inputs s={s} update={update} disabled={disabled} />;
      case 3: return <Stage3Inputs s={s} update={update} disabled={disabled} />;
      case 4: return <Stage4Inputs />;
      case 5: return <Stage5Inputs s={s} update={update} approvedIntro={stages[4]?.aiOutput} />;
      case 6: return <Stage6Inputs />;
    }
  }

  function renderExtraThoughts() {
    if (currentStage === 5 || !s.showExtra) return null;
    return (
      <div className="field extra-thoughts">
        <label>Additional thoughts</label>
        <textarea
          rows={4}
          value={s.extraThoughts}
          onChange={e => updateStage(currentStage, { extraThoughts: e.target.value })}
          placeholder="Add context, clarifications, or new ideas to refine the AI output."
          autoFocus
        />
      </div>
    );
  }

  function renderActions() {
    if (currentStage === 5) {
      return (
        <div className="btn-row">
          <button className="btn btn--primary" onClick={handleStage5Continue}>
            Submit Feedback &amp; Continue →
          </button>
        </div>
      );
    }

    if (s.approved) {
      return (
        <div className="btn-row">
          <button className="btn btn--secondary" onClick={handleRevise}>Edit / Revise</button>
        </div>
      );
    }

    return (
      <div className="btn-col">
        {!s.aiOutput && (
          <div className="btn-row">
            <button className="btn btn--primary" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating…" : GENERATE_LABELS[currentStage]}
            </button>
          </div>
        )}
        {s.aiOutput && (
          <div className="btn-row">
            <button className="btn btn--success" onClick={handleApprove}>
              {currentStage === 6 ? "Approve Revision ✓" : "Looks good. Continue →"}
            </button>
            <button className="btn btn--secondary" onClick={handleGenerate} disabled={loading}>
              {loading ? "Generating…" : "Regenerate"}
            </button>
            <button className="btn btn--secondary" onClick={handleRevise}>Revise Inputs</button>
            {!s.showExtra && (
              <button className="btn btn--ghost" onClick={handleAddMore}>+ Add more thoughts</button>
            )}
          </div>
        )}
      </div>
    );
  }

  const isComplete = stages[6]?.approved;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Thesis Introduction Maker V2</h1>
        <div className="header-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />
          <button className="btn btn--ghost-light" onClick={handleImportClick}>Import JSON</button>
          <button className="btn btn--ghost-light" onClick={() => exportJSON(state)}>Export JSON</button>
          <button className="btn btn--ghost-light" onClick={() => exportHTML(stages)}>Export HTML</button>
          <button className="btn btn--danger-ghost" onClick={() => setShowReset(true)}>Reset</button>
        </div>
      </header>

      <ProgressBar currentStage={currentStage} stages={stages} onNavigate={goTo} />

      <main className="app-main">
        {importMessage && (
          <div className={`import-banner import-banner--${importMessage.type}`} role="alert">
            {importMessage.type === "success" ? "✓ " : "✕ "}
            {importMessage.text}
            <button className="import-banner__close" onClick={() => setImportMessage(null)} aria-label="Dismiss">×</button>
          </div>
        )}

        <ApprovedSummary stages={stages} />

        {isComplete && (
          <div className="completion-banner">
            All stages complete. Your revised thesis introduction is ready. Use the Export buttons above to save your work.
          </div>
        )}

        <div className="stage-card">
          <div className="stage-card__header">
            <span className="stage-card__num">Stage {currentStage + 1} of {STAGE_NAMES.length}</span>
            <h2 className="stage-card__title">{STAGE_NAMES[currentStage]}</h2>
            {s.approved && <span className="badge badge--approved">✓ Approved</span>}
            {currentStage === 5 && stages[5]?.instructorFeedback && (
              <span className="badge badge--submitted">Submitted</span>
            )}
          </div>

          <p className="stage-card__desc">{STAGE_DESCS[currentStage]}</p>

          {renderInputs()}
          {renderExtraThoughts()}

          {error && <div className="error-msg">{error}</div>}

          {currentStage !== 5 && (
            <AIOutputBox text={s.aiOutput} loading={loading} />
          )}

          {renderActions()}
        </div>
      </main>

      {showReset && (
        <div className="modal-overlay" onClick={() => setShowReset(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Reset all progress?</h2>
            <p>This will permanently delete all your work and AI outputs from this session. This cannot be undone.</p>
            <div className="btn-row">
              <button className="btn btn--danger" onClick={handleReset}>Yes, reset everything</button>
              <button className="btn btn--secondary" onClick={() => setShowReset(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {pendingImport && (
        <div className="modal-overlay" onClick={() => setPendingImport(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Replace current work?</h2>
            <p>You have existing work in progress. Importing this file will overwrite all current inputs, AI outputs, and approved stages. This cannot be undone.</p>
            <div className="btn-row">
              <button className="btn btn--primary" onClick={() => applyImport(pendingImport)}>Yes, import and replace</button>
              <button className="btn btn--secondary" onClick={() => setPendingImport(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
