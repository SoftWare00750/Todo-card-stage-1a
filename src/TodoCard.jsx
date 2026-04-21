import { useState, useEffect, useRef, useCallback, useId } from "react";

/* ─── helpers ─────────────────────────────────────────────── */
const COLLAPSE_THRESHOLD = 160;

function getTimeLabel(dueDateStr, status) {
  if (status === "Done") return { label: "Completed", overdue: false };
  if (!dueDateStr) return { label: "No due date", overdue: false };

  const now = Date.now();
  const due = new Date(dueDateStr).getTime();
  const diff = due - now;
  const abs = Math.abs(diff);

  const mins = Math.floor(abs / 60000);
  const hrs = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);

  let label;
  if (abs < 60000) {
    label = diff >= 0 ? "Due in less than a minute" : "Overdue by less than a minute";
  } else if (abs < 3600000) {
    label = diff >= 0 ? `Due in ${mins} minute${mins !== 1 ? "s" : ""}` : `Overdue by ${mins} minute${mins !== 1 ? "s" : ""}`;
  } else if (abs < 86400000) {
    label = diff >= 0 ? `Due in ${hrs} hour${hrs !== 1 ? "s" : ""}` : `Overdue by ${hrs} hour${hrs !== 1 ? "s" : ""}`;
  } else {
    label = diff >= 0 ? `Due in ${days} day${days !== 1 ? "s" : ""}` : `Overdue by ${days} day${days !== 1 ? "s" : ""}`;
  }

  return { label, overdue: diff < 0 };
}

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ─── icons ───────────────────────────────────────────────── */
const EditIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
    <path d="M9 6V4h6v2"/>
  </svg>
);
const ChevronIcon = ({ open }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.25s ease" }}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const ClockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const AlertIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const TagIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

/* ─── config ──────────────────────────────────────────────── */
const PRIORITY_CONFIG = {
  Low:    { color: "var(--pri-low)",  bg: "var(--pri-low-bg)"  },
  Medium: { color: "var(--pri-med)",  bg: "var(--pri-med-bg)"  },
  High:   { color: "var(--pri-high)", bg: "var(--pri-high-bg)" },
};

const STATUS_CONFIG = {
  "Pending":     { color: "var(--status-pending)",  symbol: "○" },
  "In Progress": { color: "var(--status-progress)", symbol: "◑" },
  "Done":        { color: "var(--status-done)",      symbol: "●" },
};

/* ─── default data ────────────────────────────────────────── */
const DEFAULT_TODO = {
  id: "todo-001",
  title: "Design the onboarding flow for mobile app",
  description:
    "Create a comprehensive onboarding experience that guides new users through the core features of the application. This should include welcome screens, feature highlights, permission requests, and an optional profile setup step. Ensure the flow is skippable and adheres to platform-specific HIG guidelines. Test across multiple device sizes including iPhone SE and large Android phones.",
  priority: "High",
  status: "In Progress",
  dueDate: (() => { const d = new Date(); d.setHours(d.getHours() + 26); return d.toISOString(); })(),
  tags: ["design", "mobile", "ux"],
  assignee: "Alex K.",
};

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
export default function TodoCard() {
  const [todo, setTodo] = useState(DEFAULT_TODO);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [timeInfo, setTimeInfo] = useState({ label: "", overdue: false });
  const [deleted, setDeleted] = useState(false);

  const editBtnRef = useRef(null);
  const firstFieldRef = useRef(null);
  const collapsibleId = useId();
  const statusId = useId();

  const isLong = todo.description.length > COLLAPSE_THRESHOLD;
  const isDone = todo.status === "Done";
  const pc = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.Medium;
  const sc = STATUS_CONFIG[todo.status] || STATUS_CONFIG.Pending;

  /* time ticker */
  useEffect(() => {
    setTimeInfo(getTimeLabel(todo.dueDate, todo.status));
    if (todo.status === "Done") return;
    const id = setInterval(() => setTimeInfo(getTimeLabel(todo.dueDate, todo.status)), 45000);
    return () => clearInterval(id);
  }, [todo.dueDate, todo.status]);

  /* focus management */
  useEffect(() => {
    if (isEditing && firstFieldRef.current) firstFieldRef.current.focus();
    else if (!isEditing && editBtnRef.current) editBtnRef.current.focus();
  }, [isEditing]);

  const openEdit = useCallback(() => {
    setDraft({
      title: todo.title,
      description: todo.description,
      priority: todo.priority,
      dueDate: formatDateForInput(todo.dueDate),
      tags: todo.tags.join(", "),
    });
    setIsEditing(true);
  }, [todo]);

  const saveEdit = (e) => {
    e.preventDefault();
    setTodo((prev) => ({
      ...prev,
      title: draft.title.trim() || prev.title,
      description: draft.description,
      priority: draft.priority,
      dueDate: draft.dueDate ? new Date(draft.dueDate).toISOString() : prev.dueDate,
      tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
    }));
    setIsEditing(false);
  };

  const cancelEdit = () => setIsEditing(false);

  const handleCheckbox = (checked) => setTodo((p) => ({ ...p, status: checked ? "Done" : "Pending" }));
  const handleStatus = (val) => setTodo((p) => ({ ...p, status: val }));

  if (deleted) {
    return (
      <>
        <style>{css}</style>
        <div className="page-wrapper">
          <div className="deleted-card">
            <span>Task deleted.</span>
            <button onClick={() => setDeleted(false)}>Undo</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="page-wrapper">
        <header className="page-header">
          <span className="eyebrow">Frontend Wizards · Stage 1a</span>
          <h1 className="page-title">Todo<em>Card</em></h1>
          <p className="page-sub">Interactive · Stateful · Accessible</p>
        </header>

        <article
          className={[
            "todo-card",
            isDone ? "is-done" : "",
            timeInfo.overdue && !isDone ? "is-overdue" : "",
            todo.status === "In Progress" ? "is-progress" : "",
            `pri-${todo.priority.toLowerCase()}`,
          ].filter(Boolean).join(" ")}
          data-testid="test-todo-card"
          aria-label={`Task: ${todo.title}`}
        >
          {/* priority accent bar */}
          <span
            className="pri-accent"
            data-testid="test-todo-priority-indicator"
            aria-label={`Priority: ${todo.priority}`}
            style={{ background: pc.color }}
          />

          {/* ── HEADER ── */}
          <div className="c-header">
            <div className="c-header-left">
              <label className="cb-wrap" aria-label="Mark as done">
                <input
                  type="checkbox"
                  data-testid="test-todo-checkbox"
                  checked={isDone}
                  onChange={(e) => handleCheckbox(e.target.checked)}
                />
                <span className="cb-box" />
              </label>

              <div className="title-area">
                <span className="task-id">#{todo.id}</span>
                <h2 className="task-title" data-testid="test-todo-title">{todo.title}</h2>
              </div>
            </div>

            <div className="c-actions">
              <button
                className="btn-edit"
                data-testid="test-todo-edit-button"
                ref={editBtnRef}
                onClick={openEdit}
                disabled={isEditing}
                aria-label="Edit task"
              >
                <EditIcon /> <span>Edit</span>
              </button>
              <button
                className="btn-delete"
                data-testid="test-todo-delete-button"
                onClick={() => setDeleted(true)}
                aria-label="Delete task"
              >
                <TrashIcon />
              </button>
            </div>
          </div>

          {/* ── META ── */}
          <div className="c-meta">
            {/* priority badge */}
            <span
              className="badge pri-badge"
              data-testid="test-todo-priority"
              style={{ color: pc.color, background: pc.bg, borderColor: pc.color + "40" }}
            >
              <span className="pri-dot" />
              {todo.priority}
            </span>

            {/* status */}
            <div className="status-field">
              <label htmlFor={statusId} className="sr-only">Status</label>
              <select
                id={statusId}
                className="status-sel"
                data-testid="test-todo-status-control"
                value={todo.status}
                onChange={(e) => handleStatus(e.target.value)}
                aria-label="Task status"
                style={{ color: sc.color, borderColor: sc.color + "50" }}
              >
                {Object.keys(STATUS_CONFIG).map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].symbol} {s}</option>
                ))}
              </select>
            </div>

            {/* assignee */}
            {todo.assignee && (
              <span className="badge assignee" data-testid="test-todo-assignee">
                <span className="av">{todo.assignee[0]}</span>
                {todo.assignee}
              </span>
            )}
          </div>

          {/* ── TIME ── */}
          <div className="c-time" aria-live="polite" aria-atomic="true">
            {timeInfo.overdue && !isDone ? (
              <span className="overdue-pill" data-testid="test-todo-overdue-indicator" role="status">
                <AlertIcon />
                <span data-testid="test-todo-due-date">{timeInfo.label}</span>
              </span>
            ) : (
              <span className="time-pill" data-testid="test-todo-due-date">
                <ClockIcon />
                <span>{timeInfo.label}</span>
              </span>
            )}
          </div>

          {/* ── DESCRIPTION ── */}
          <div className="c-body">
            <div
              id={collapsibleId}
              className={["collapsible", !expanded && isLong ? "collapsed" : ""].join(" ")}
              data-testid="test-todo-collapsible-section"
            >
              <p className="desc-text" data-testid="test-todo-description">
                {todo.description}
              </p>
            </div>
            {isLong && (
              <button
                className="toggle-btn"
                data-testid="test-todo-expand-toggle"
                aria-expanded={expanded}
                aria-controls={collapsibleId}
                onClick={() => setExpanded((v) => !v)}
              >
                <ChevronIcon open={expanded} />
                <span>{expanded ? "Show less" : "Show more"}</span>
              </button>
            )}
          </div>

          {/* ── TAGS ── */}
          {todo.tags.length > 0 && (
            <div className="c-tags" data-testid="test-todo-tags">
              {todo.tags.map((t) => (
                <span key={t} className="tag">
                  <TagIcon /> {t}
                </span>
              ))}
            </div>
          )}

          {/* ── EDIT FORM ── */}
          {isEditing && (
            <section
              className="edit-panel"
              role="dialog"
              aria-label="Edit task"
              aria-modal="true"
              onKeyDown={(e) => e.key === "Escape" && cancelEdit()}
            >
              <form
                className="edit-form"
                data-testid="test-todo-edit-form"
                onSubmit={saveEdit}
              >
                <div className="ef-header">
                  <h3>Edit Task</h3>
                  <span className="ef-ornament">✦</span>
                </div>

                <div className="ef-field">
                  <label htmlFor="ef-title" className="ef-label">Title</label>
                  <input
                    id="ef-title"
                    ref={firstFieldRef}
                    type="text"
                    className="ef-input"
                    data-testid="test-todo-edit-title-input"
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Task title…"
                    required
                  />
                </div>

                <div className="ef-field">
                  <label htmlFor="ef-desc" className="ef-label">Description</label>
                  <textarea
                    id="ef-desc"
                    className="ef-input ef-textarea"
                    data-testid="test-todo-edit-description-input"
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    placeholder="Describe the task…"
                    rows={4}
                  />
                </div>

                <div className="ef-row">
                  <div className="ef-field">
                    <label htmlFor="ef-priority" className="ef-label">Priority</label>
                    <select
                      id="ef-priority"
                      className="ef-input ef-select"
                      data-testid="test-todo-edit-priority-select"
                      value={draft.priority}
                      onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="ef-field">
                    <label htmlFor="ef-date" className="ef-label">Due Date</label>
                    <input
                      id="ef-date"
                      type="datetime-local"
                      className="ef-input"
                      data-testid="test-todo-edit-due-date-input"
                      value={draft.dueDate}
                      onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="ef-field">
                  <label htmlFor="ef-tags" className="ef-label">
                    Tags <span className="ef-hint">(comma-separated)</span>
                  </label>
                  <input
                    id="ef-tags"
                    type="text"
                    className="ef-input"
                    value={draft.tags}
                    onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                    placeholder="design, mobile, ux"
                  />
                </div>

                <div className="ef-actions">
                  <button
                    type="button"
                    className="ef-cancel"
                    data-testid="test-todo-cancel-button"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ef-save"
                    data-testid="test-todo-save-button"
                  >
                    Save changes
                  </button>
                </div>
              </form>
            </section>
          )}
        </article>

        <footer className="page-footer">
          Frontend Wizards · Stage 1a · Advanced Todo Card
        </footer>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #0c0d11;
  --surf:     #13151c;
  --surf2:    #1a1d26;
  --surf3:    #22253080;
  --bdr:      rgba(255,255,255,0.065);
  --bdr2:     rgba(255,255,255,0.12);

  --txt:      #ecedf5;
  --txt2:     #888ba0;
  --txt3:     #52546a;

  --pri-high:    #ff5f6d;  --pri-high-bg: rgba(255,95,109,0.1);
  --pri-med:     #ffb547;  --pri-med-bg:  rgba(255,181,71,0.1);
  --pri-low:     #4ecdc4;  --pri-low-bg:  rgba(78,205,196,0.1);

  --s-pending:   #6b7280;
  --s-progress:  #818cf8;
  --s-done:      #34d399;

  --overdue:  #f87171;
  --accent:   #818cf8;
  --accent2:  #c084fc;
  --r:        14px;
  --rs:       8px;
  --ease:     0.18s ease;
  --ff:       'Syne', sans-serif;
  --fm:       'DM Mono', monospace;
}

html, body { background: var(--bg); color: var(--txt); font-family: var(--fm); }
.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

/* PAGE */
.page-wrapper {
  min-height: 100vh;
  display: flex; flex-direction: column;
  align-items: center;
  padding: 52px 16px 64px;
  gap: 28px;
  background: var(--bg);
  background-image:
    radial-gradient(ellipse 90% 55% at 15% 5%, rgba(129,140,248,.07) 0%, transparent 65%),
    radial-gradient(ellipse 60% 45% at 85% 95%, rgba(192,132,252,.05) 0%, transparent 60%);
}

.page-header { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.eyebrow { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--accent2); opacity: .75; }
.page-title {
  font-family: var(--ff); font-size: clamp(30px, 6vw, 46px);
  font-weight: 800; letter-spacing: -.03em; line-height: 1;
}
.page-title em { font-style: italic; color: var(--accent2); }
.page-sub { font-size: 10.5px; color: var(--txt3); letter-spacing: .1em; }

/* CARD */
.todo-card {
  position: relative; width: 100%; max-width: 640px;
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: var(--r);
  overflow: hidden;
  transition: box-shadow var(--ease), border-color var(--ease);
}
.todo-card:hover { border-color: var(--bdr2); box-shadow: 0 12px 48px rgba(0,0,0,.45); }

/* state variants */
.todo-card.is-done { opacity: .58; }
.todo-card.is-done .task-title { text-decoration: line-through; color: var(--txt3); }
.todo-card.is-overdue { border-color: rgba(248,113,113,.2); }
.todo-card.is-progress { border-color: rgba(129,140,248,.18); }

/* priority accent */
.pri-accent {
  position: absolute; top: 0; left: 0;
  width: 3px; height: 100%;
  border-radius: 3px 0 0 3px;
}
.todo-card.pri-high  { box-shadow: 0 0 0 1px rgba(255,95,109,.08); }
.todo-card.pri-high  .pri-accent { background: var(--pri-high) !important; }
.todo-card.pri-medium .pri-accent { background: var(--pri-med) !important; }
.todo-card.pri-low   .pri-accent { background: var(--pri-low) !important; }

/* HEADER */
.c-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 10px;
  padding: 20px 18px 14px 24px;
}
.c-header-left { display: flex; align-items: flex-start; gap: 11px; flex: 1; min-width: 0; }

/* checkbox */
.cb-wrap { display: flex; align-items: center; cursor: pointer; flex-shrink: 0; margin-top: 3px; }
.cb-wrap input { position: absolute; opacity: 0; width: 0; height: 0; }
.cb-box {
  width: 18px; height: 18px;
  border: 1.5px solid var(--bdr2);
  border-radius: 5px;
  background: transparent;
  display: flex; align-items: center; justify-content: center;
  transition: all var(--ease); flex-shrink: 0;
}
.cb-wrap input:checked + .cb-box { background: var(--s-done); border-color: var(--s-done); }
.cb-wrap input:checked + .cb-box::after {
  content: '';
  display: block; width: 4px; height: 8px;
  border: 2px solid #0c0d11; border-top: none; border-left: none;
  transform: rotate(45deg) translate(-1px,-1px);
}
.cb-wrap:hover .cb-box { border-color: var(--s-done); }
.cb-wrap input:focus-visible + .cb-box { outline: 2px solid var(--accent); outline-offset: 2px; }

/* title */
.title-area { min-width: 0; }
.task-id { display: block; font-size: 9.5px; color: var(--txt3); letter-spacing: .1em; margin-bottom: 4px; }
.task-title {
  font-family: var(--ff); font-size: clamp(14.5px, 2.5vw, 16.5px);
  font-weight: 700; line-height: 1.3; color: var(--txt);
  word-break: break-word; transition: color var(--ease), text-decoration var(--ease);
}

/* actions */
.c-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.btn-edit, .btn-delete {
  display: flex; align-items: center; gap: 5px;
  border: 1px solid var(--bdr); border-radius: var(--rs);
  background: var(--surf2); color: var(--txt2);
  font-family: var(--fm); font-size: 11px;
  cursor: pointer; transition: all var(--ease);
}
.btn-edit { padding: 6px 10px; }
.btn-delete { padding: 6px 8px; }
.btn-edit:hover:not(:disabled), .btn-delete:hover { background: var(--surf3, #22253088); border-color: var(--bdr2); color: var(--txt); }
.btn-delete:hover { color: var(--pri-high); border-color: rgba(255,95,109,.3); }
.btn-edit:disabled { opacity: .38; cursor: not-allowed; }
.btn-edit:focus-visible, .btn-delete:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

/* META */
.c-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; padding: 0 18px 12px 24px; }
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 99px;
  font-size: 10.5px; font-family: var(--fm);
  border: 1px solid transparent;
}
.pri-badge { font-weight: 500; }
.pri-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor; flex-shrink: 0;
}
.assignee { background: var(--surf2); color: var(--txt2); border-color: var(--bdr); }
.av {
  width: 16px; height: 16px; border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display: flex; align-items: center; justify-content: center;
  font-size: 8.5px; color: #fff; font-weight: 600; flex-shrink: 0;
}

/* status select */
.status-sel {
  appearance: none; -webkit-appearance: none;
  padding: 3px 10px; border-radius: 99px;
  border: 1px solid var(--bdr2);
  background: var(--surf2);
  font-family: var(--fm); font-size: 10.5px;
  cursor: pointer; transition: all var(--ease);
}
.status-sel:hover { background: var(--surf3, #2225308a); }
.status-sel:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.status-sel option { background: #1a1d26; color: var(--txt); }

/* TIME */
.c-time { padding: 0 18px 14px 24px; }
.time-pill, .overdue-pill {
  display: inline-flex; align-items: center; gap: 5px; font-size: 11px;
}
.time-pill { color: var(--txt3); }
.overdue-pill {
  color: var(--overdue);
  background: rgba(248,113,113,.1);
  padding: 3px 9px; border-radius: 99px;
  border: 1px solid rgba(248,113,113,.22);
  font-weight: 500;
}

/* DESCRIPTION */
.c-body { padding: 0 18px 16px 24px; border-top: 1px solid var(--bdr); padding-top: 14px; }
.collapsible { overflow: hidden; transition: max-height .3s ease; max-height: 2000px; }
.collapsible.collapsed {
  max-height: 68px;
  -webkit-mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
}
.desc-text { font-size: 12.5px; color: var(--txt2); line-height: 1.68; }
.toggle-btn {
  display: flex; align-items: center; gap: 5px;
  margin-top: 8px; background: none; border: none;
  color: var(--accent2); font-family: var(--fm); font-size: 11px;
  cursor: pointer; padding: 4px 0; transition: color var(--ease);
}
.toggle-btn:hover { color: var(--txt); }
.toggle-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 3px; }

/* TAGS */
.c-tags {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 10px 18px 16px 24px;
  border-top: 1px solid var(--bdr);
}
.tag {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: var(--rs);
  background: var(--surf2); border: 1px solid var(--bdr);
  color: var(--txt3); font-size: 10px; font-family: var(--fm);
}

/* EDIT PANEL */
.edit-panel {
  background: var(--surf2);
  border-top: 1px solid var(--bdr2);
  padding: 20px 22px;
  animation: slideIn .2s ease;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.edit-form { display: flex; flex-direction: column; gap: 14px; }
.ef-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 2px;
}
.ef-header h3 { font-family: var(--ff); font-size: 13.5px; font-weight: 700; letter-spacing: -.02em; }
.ef-ornament { font-size: 16px; color: var(--accent2); opacity: .45; }
.ef-field { display: flex; flex-direction: column; gap: 5px; flex: 1; }
.ef-label { font-size: 9.5px; color: var(--txt3); letter-spacing: .1em; text-transform: uppercase; }
.ef-hint { color: var(--txt3); font-size: 8.5px; }
.ef-input {
  padding: 8px 11px;
  background: var(--surf);
  border: 1px solid var(--bdr);
  border-radius: var(--rs);
  color: var(--txt); font-family: var(--fm); font-size: 12.5px;
  transition: border-color var(--ease); width: 100%;
}
.ef-input::placeholder { color: var(--txt3); }
.ef-input:hover { border-color: var(--bdr2); }
.ef-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(129,140,248,.14); }
.ef-textarea { resize: vertical; min-height: 80px; line-height: 1.55; }
.ef-select { cursor: pointer; }
.ef-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ef-actions {
  display: flex; justify-content: flex-end; gap: 8px;
  padding-top: 12px; border-top: 1px solid var(--bdr);
}
.ef-cancel, .ef-save {
  padding: 7px 16px; border-radius: var(--rs);
  font-family: var(--fm); font-size: 11.5px; font-weight: 500;
  cursor: pointer; transition: all var(--ease);
}
.ef-cancel { background: transparent; border: 1px solid var(--bdr2); color: var(--txt2); }
.ef-cancel:hover { background: var(--surf); color: var(--txt); }
.ef-save { background: var(--accent); border: 1px solid var(--accent); color: #fff; }
.ef-save:hover { background: #6c7af0; }
.ef-cancel:focus-visible, .ef-save:focus-visible { outline: 2px solid var(--accent2); outline-offset: 2px; }

/* DELETED */
.deleted-card {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 22px; max-width: 640px; width: 100%;
  background: var(--surf); border: 1px dashed var(--bdr2);
  border-radius: var(--r); color: var(--txt2); font-size: 13px;
}
.deleted-card button {
  background: none; border: 1px solid var(--bdr2);
  border-radius: var(--rs); color: var(--accent2);
  font-family: var(--fm); font-size: 11px;
  padding: 3px 10px; cursor: pointer;
}

/* FOOTER */
.page-footer { font-size: 9.5px; color: var(--txt3); letter-spacing: .08em; text-align: center; }

/* RESPONSIVE */
@media (max-width: 420px) {
  .page-wrapper { padding: 28px 10px 40px; }
  .c-header { padding: 14px 14px 10px 18px; }
  .c-meta, .c-time, .c-body, .c-tags { padding-left: 18px; padding-right: 14px; }
  .btn-edit span { display: none; }
  .btn-edit { padding: 7px 8px; }
  .ef-row { grid-template-columns: 1fr; }
  .edit-panel { padding: 14px 14px; }
}
@media (min-width: 768px) {
  .c-meta { flex-wrap: nowrap; }
}
`;
