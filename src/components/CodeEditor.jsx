import { useEffect, useRef, useState } from "react";
import MonacoEditor from "@monaco-editor/react";

const LANGUAGES = [
  { id: "python",     label: "Python",      starter: "def solution():\n    # write your solution here\n    pass\n" },
  { id: "javascript", label: "JavaScript",  starter: "function solution() {\n  // write your solution here\n}\n" },
  { id: "typescript", label: "TypeScript",  starter: "function solution(): void {\n  // write your solution here\n}\n" },
  { id: "java",       label: "Java",        starter: "class Solution {\n    public void solve() {\n        // write your solution here\n    }\n}\n" },
  { id: "cpp",        label: "C++",         starter: "#include <bits/stdc++.h>\nusing namespace std;\n\nvoid solution() {\n    // write your solution here\n}\n" },
  { id: "go",         label: "Go",          starter: "package main\n\nfunc solution() {\n\t// write your solution here\n}\n" },
  { id: "kotlin",     label: "Kotlin",      starter: "fun solution() {\n    // write your solution here\n}\n" },
  { id: "rust",       label: "Rust",        starter: "fn solution() {\n    // write your solution here\n}\n" },
  { id: "swift",      label: "Swift",       starter: "func solution() {\n    // write your solution here\n}\n" },
  { id: "csharp",     label: "C#",          starter: "class Solution {\n    public void Solve() {\n        // write your solution here\n    }\n}\n" },
  { id: "ruby",       label: "Ruby",        starter: "def solution\n  # write your solution here\nend\n" },
  { id: "php",        label: "PHP",         starter: "<?php\nfunction solution() {\n    // write your solution here\n}\n" },
  { id: "scala",      label: "Scala",       starter: "object Solution {\n  def solve(): Unit = {\n    // write your solution here\n  }\n}\n" },
  { id: "r",          label: "R",           starter: "solution <- function() {\n  # write your solution here\n}\n" },
  { id: "dart",       label: "Dart",        starter: "void solution() {\n  // write your solution here\n}\n" },
  { id: "elixir",     label: "Elixir",      starter: "defmodule Solution do\n  def solve do\n    # write your solution here\n  end\nend\n" },
];

const MONACO_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 13,
  lineHeight: 20,
  fontFamily: "'JetBrains Mono', 'Fira Mono', 'Menlo', monospace",
  padding: { top: 16, bottom: 16 },
  scrollBeyondLastLine: false,
  renderLineHighlight: "none",
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  scrollbar: { vertical: "auto", horizontal: "hidden", verticalScrollbarSize: 6 },
  lineNumbers: "on",
  glyphMargin: true,
  folding: false,
  lineDecorationsWidth: 12,
  lineNumbersMinChars: 3,
  wordWrap: "on",
  suggest: { showWords: false },
  quickSuggestions: false,
};

/**
 * CodeEditor
 * Props:
 *   onReviewRequest(code, language) — called when user clicks "Review with AI"
 *   reviewLoading — bool, disables button while AI is working
 *   inlineHints   — [{line, message, type}] from AI review, rendered as ghost comments
 */
const LS_LANG_KEY = "crackd_editor_lang";
// Per-question key: crackd_q_<questionId>  →  JSON {code, langId}
// Fallback (no question): crackd_editor_code_<langId>
const lsQuestionKey = qid => `crackd_q_${qid}`;
const lsLangCodeKey = id => `crackd_editor_code_${id}`;

function savedLang() {
  try {
    const id = localStorage.getItem(LS_LANG_KEY);
    return LANGUAGES.find(l => l.id === id) || LANGUAGES[0];
  } catch { return LANGUAGES[0]; }
}

function loadQuestionState(questionId) {
  if (!questionId) return null;
  try {
    const raw = localStorage.getItem(lsQuestionKey(questionId));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveQuestionState(questionId, code, langId) {
  if (!questionId) return;
  try { localStorage.setItem(lsQuestionKey(questionId), JSON.stringify({ code, langId })); } catch {}
}

function savedCode(lang) {
  try {
    return localStorage.getItem(lsLangCodeKey(lang.id)) ?? lang.starter;
  } catch { return lang.starter; }
}

export function CodeEditor({ questionId, apiCode, onReviewRequest, reviewLoading = false, inlineHints = [] }) {
  const [lang, setLang] = useState(() => savedLang());
  const [code, setCode] = useState(() => savedCode(savedLang()));
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef(null);
  const saveTimerRef = useRef(null);

  // When the active question changes: load from per-question localStorage, then apiCode, then starter
  useEffect(() => {
    if (!questionId) return;
    const saved = loadQuestionState(questionId);
    if (saved) {
      const savedLangObj = LANGUAGES.find(l => l.id === saved.langId) || lang;
      setLang(savedLangObj);
      setCode(saved.code);
    } else if (apiCode?.code) {
      const apiLang = LANGUAGES.find(l => l.id === apiCode.language) || lang;
      setLang(apiLang);
      setCode(apiCode.code);
      saveQuestionState(questionId, apiCode.code, apiLang.id);
    } else {
      setCode(lang.starter);
    }
  }, [questionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When apiCode arrives after question was already set (async fetch completed)
  useEffect(() => {
    if (!questionId || !apiCode?.code) return;
    if (loadQuestionState(questionId)) return; // localStorage wins
    const apiLang = LANGUAGES.find(l => l.id === apiCode.language) || lang;
    setLang(apiLang);
    setCode(apiCode.code);
    saveQuestionState(questionId, apiCode.code, apiLang.id);
  }, [apiCode]); // eslint-disable-line react-hooks/exhaustive-deps

  function persistCode(value) {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (questionId) {
        saveQuestionState(questionId, value, lang.id);
      } else {
        try { localStorage.setItem(lsLangCodeKey(lang.id), value); } catch {}
      }
    }, 600);
  }

  function handleCodeChange(value) {
    const v = value ?? "";
    setCode(v);
    persistCode(v);
  }

  function switchLanguage(l) {
    try { localStorage.setItem(LS_LANG_KEY, l.id); } catch {}
    setLang(l);
    const newCode = questionId ? (loadQuestionState(questionId)?.code ?? l.starter) : savedCode(l);
    setCode(newCode);
    setLangPickerOpen(false);
  }

  // Apply / clear inline hint decorations whenever hints change
  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    if (decorationsRef.current) {
      decorationsRef.current.clear();
      decorationsRef.current = null;
    }

    if (!inlineHints.length) return;

    decorationsRef.current = editor.createDecorationsCollection(
      inlineHints.map(hint => ({
        range: new monaco.Range(hint.line, 1, hint.line, 1),
        options: {
          isWholeLine: true,
          className: `crackd-hint-line crackd-hint-line--${hint.type}`,
          glyphMarginClassName: `crackd-hint-glyph crackd-hint-glyph--${hint.type}`,
          glyphMarginHoverMessage: { value: hint.message },
          hoverMessage: { value: hint.message },
          after: {
            content: `   // ${hint.message.length > 72 ? hint.message.slice(0, 72) + "…" : hint.message}`,
            inlineClassName: `crackd-hint-text crackd-hint-text--${hint.type}`,
          },
        },
      }))
    );
  }, [inlineHints]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#1E1E1E",
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid #2D2D2D",
      boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
    }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        background: "#252525",
        borderBottom: "1px solid #2D2D2D",
        gap: 10,
      }}>

        {/* Left: traffic lights + language picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: 6 }}>
            {["#FF5F57", "#FFBD2E", "#28C840"].map(c => (
              <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.85 }} />
            ))}
          </div>

          {/* Language picker */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setLangPickerOpen(o => !o)}
              style={{
                background: "#333",
                border: "1px solid #444",
                borderRadius: 8,
                color: "#CCC",
                fontSize: 11,
                fontWeight: 500,
                padding: "4px 10px",
                cursor: "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              {lang.label}
              <span style={{ fontSize: 8, opacity: 0.7 }}>▼</span>
            </button>

            {langPickerOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                background: "#2A2A2A",
                border: "1px solid #3A3A3A",
                borderRadius: 10,
                overflow: "hidden",
                zIndex: 100,
                minWidth: 130,
                maxHeight: 280,
                overflowY: "auto",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}>
                {LANGUAGES.map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => switchLanguage(l)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      background: l.id === lang.id ? "#383838" : "transparent",
                      border: "none",
                      color: l.id === lang.id ? "#FFF" : "#BBB",
                      fontSize: 12,
                      padding: "8px 14px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: l.id === lang.id ? 600 : 400,
                    }}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: review button */}
        <button
          type="button"
          onClick={() => onReviewRequest && onReviewRequest(code, lang.id)}
          disabled={reviewLoading}
          style={{
            background: reviewLoading ? "#444" : "#D97757",
            color: "#FFF",
            border: "none",
            borderRadius: 8,
            padding: "5px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: reviewLoading ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            letterSpacing: "-0.01em",
            transition: "background 0.15s",
            opacity: reviewLoading ? 0.7 : 1,
          }}
        >
          {reviewLoading ? "Reviewing…" : "Review with AI ✦"}
        </button>
      </div>

      {/* ── Editor ── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <MonacoEditor
          height="100%"
          language={lang.id}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={MONACO_OPTIONS}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
          }}
          loading={
            <div style={{ height: "100%", background: "#1E1E1E", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: 12 }}>
              Loading editor…
            </div>
          }
        />
      </div>

      {/* Decoration styles injected into document so Monaco picks them up */}
      <style>{`
        .crackd-hint-line--suggestion { background: rgba(168, 107, 26, 0.07) !important; }
        .crackd-hint-line--warning    { background: rgba(168, 40,  40, 0.08) !important; }
        .crackd-hint-line--positive   { background: rgba(26,  122, 72, 0.07) !important; }
        .crackd-hint-text { font-style: italic; opacity: 0.75; pointer-events: none; white-space: pre; }
        .crackd-hint-text--suggestion { color: #C8923A !important; }
        .crackd-hint-text--warning    { color: #D06060 !important; }
        .crackd-hint-text--positive   { color: #4CAF82 !important; }
        .crackd-hint-glyph { width: 16px !important; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: default; }
        .crackd-hint-glyph--suggestion::before { content: "→"; color: #C8923A; font-weight: 700; }
        .crackd-hint-glyph--warning::before    { content: "⚠"; color: #D06060; }
        .crackd-hint-glyph--positive::before   { content: "✓"; color: #4CAF82; font-weight: 700; }
      `}</style>

      {/* ── Footer ── */}
      <div style={{
        padding: "8px 14px",
        background: "#252525",
        borderTop: "1px solid #2D2D2D",
        fontSize: 10,
        color: "#555",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <span>⌘S · save · AI review</span>
        <span style={{ marginLeft: "auto" }}>{lang.label}</span>
      </div>

    </div>
  );
}
