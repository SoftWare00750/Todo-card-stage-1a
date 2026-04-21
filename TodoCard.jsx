import { useState, useEffect, useRef, useCallback } from "react";

const PRIORITY_CONFIG = {
  Low: { color: "#3B6D11", bg: "#EAF3DE", border: "#639922", dot: "#639922" },
  Medium: { color: "#854F0B", bg: "#FAEEDA", border: "#EF9F27", dot: "#EF9F27" },
  High: { color: "#A32D2D", bg: "#FCEBEB", border: "#E24B4A", dot: "#E24B4A" },
};

const STATUS_ICONS = { Pending: "○", "In Progress": "◑", Done: "●" };

const INITIAL_TODO = {
  title: "Redesign the onboarding flow for mobile",
  description:
    "Review all current onboarding screens, gather feedback from the last user testing session, and draft a revised wireframe that reduces drop-off at step 3. Coordinate with the growth team to align on metrics we care about. Make sure the new flow works across iOS, Android, and responsive web. Document decisions in Notion and share with stakeholders by end of sprint.",
  priority: "High",
  status: "In Progress",
  dueDate: (() => {
    const d = new Date();
    d.setHours(d.getHours() + 3, d.getMinutes() + 27, 0, 0);
    return d.toISOString().slice(0, 16);
  })(),
  tags: ["design", "mobile", "sprint-4"],
};

const COLLAPSE_THRESHOLD = 120;

function formatRelativeTime(dueDateStr, status) {
  if (status === "Done") return "Completed";
  const now = new Date();
  const due = new Date(dueDateStr);
  const diffSec = Math.round((due - now) / 1000);
  const abs = Math.abs(diffSec);
  const over = diffSec < 0;
  let v, u;
  if (abs < 60) { v = abs; u = `second${abs !== 1 ? "s" : ""}`; }
  else if (abs < 3600) { v = Math.round(abs / 60); u = `minute${v !== 1 ? "s" : ""}`; }
  else if (abs < 86400) { v = Math.round(abs / 3600); u = `hour${v !== 1 ? "s" : ""}`; }
  else { v = Math.round(abs / 86400); u = `day${v !== 1 ? "s" : ""}`; }
  return over ? `Overdue by ${v} ${u}` : `Due in ${v} ${u}`;
}

function isOverdue(dueDateStr, status) {
  if (status === "Done") return false;
  return new Date(dueDateStr) < new Date();
}

function fmtDate(str) {
  if (!str) return "";
  return new Date(str).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const SR = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 };

export default function TodoCard() {
  const [todo, setTodo] = useState(INITIAL_TODO);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(INITIAL_TODO);
  const [tagInput, setTagInput] = useState(INITIAL_TODO.tags.join(", "));
  const [expanded, setExpanded] = useState(false);
  const [timeLabel, setTimeLabel] = useState(() => formatRelativeTime(INITIAL_TODO.dueDate, INITIAL_TODO.status));
  const editBtnRef = useRef(null);
  const firstRef = useRef(null);

  const isDone = todo.status === "Done";
  const overdue = isOverdue(todo.dueDate, todo.status);
  const longDesc = todo.description.length > COLLAPSE_THRESHOLD;
  const prio = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.Medium;

  useEffect(() => {
    setTimeLabel(formatRelativeTime(todo.dueDate, todo.status));
    if (isDone) return;
    const id = setInterval(() => setTimeLabel(formatRelativeTime(todo.dueDate, todo.status)), 30000);
    return () => clearInterval(id);
  }, [todo.dueDate, todo.status, isDone]);

  const handleCheckbox = () =>
    setTodo(p => ({ ...p, status: p.status === "Done" ? "Pending" : "Done" }));

  const handleStatusChange = e =>
    setTodo(p => ({ ...p, status: e.target.value }));

  const openEdit = () => {
    setDraft(todo);
    setTagInput(todo.tags.join(", "));
    setIsEditing(true);
    setTimeout(() => firstRef.current?.focus(), 50);
  };

  const handleSave = () => {
    const tags = tagInput.split(",").map(t => t.trim()).filter(Boolean);
    setTodo({ ...draft, tags });
    setIsEditing(false);
    setTimeout(() => editBtnRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setTimeout(() => editBtnRef.current?.focus(), 50);
  };

  const visibleDesc = !longDesc || expanded
    ? todo.description
    : todo.description.slice(0, COLLAPSE_THRESHOLD) + "…";

  const mono = "'DM Mono','Fira Mono','Courier New',monospace";

  return (
    <div style={{ fontFamily: mono, padding: "2rem 1rem", maxWidth: 640, margin: "0 auto" }}>
      <h2 style={SR}>Advanced Todo Card — Stage 1a</h2>

      {/* ── Card ── */}
      <div
        role="article"
        aria-label={todo.title}
        style={{
          background: "var(--color-background-primary)",
          border: `1.5px solid ${overdue && !isDone ? "#E24B4A" : "var(--color-border-tertiary)"}`,
          borderLeft: `4px solid ${prio.border}`,
          borderRadius: "var(--border-radius-lg)",
          padding: "1.25rem",
          opacity: isDone ? 0.72 : 1,
          transition: "border-color 0.2s, opacity 0.2s",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <input
            type="checkbox"
            data-testid="test-todo-checkbox"
            checked={isDone}
            onChange={handleCheckbox}
            aria-label="Mark as done"
            tabIndex={0}
            style={{ width: 18, height: 18, marginTop: 3, accentColor: prio.border, cursor: "pointer", flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              data-testid="test-todo-title"
              style={{
                fontSize: 16, fontWeight: 500, margin: "0 0 6px",
                color: isDone ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
                textDecoration: isDone ? "line-through" : "none",
                wordBreak: "break-word",
              }}
            >
              {todo.title}
            </p>
            {/* Tags */}
            {todo.tags.length > 0 && (
              <div data-testid="test-todo-tags" style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {todo.tags.map(t => (
                  <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)", fontFamily: mono }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, marginBottom: 10 }}>
          {/* Priority Indicator */}
          <span
            data-testid="test-todo-priority-indicator"
            aria-label={`Priority: ${todo.priority}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, padding: "3px 9px", borderRadius: "var(--border-radius-md)", background: prio.bg, color: prio.color, border: `0.5px solid ${prio.border}`, fontWeight: 500 }}
          >
            <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: prio.dot, flexShrink: 0 }} />
            <span data-testid="test-todo-priority-badge">{todo.priority}</span>
          </span>

          {/* Status Control */}
          <label htmlFor="status-ctrl" style={SR}>Status</label>
          <select
            id="status-ctrl"
            data-testid="test-todo-status-control"
            value={todo.status}
            onChange={handleStatusChange}
            aria-label="Change status"
            tabIndex={0}
            style={{ fontSize: 12, padding: "3px 8px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", cursor: "pointer", fontFamily: mono }}
          >
            {["Pending", "In Progress", "Done"].map(s => (
              <option key={s} value={s}>{STATUS_ICONS[s]} {s}</option>
            ))}
          </select>

          {/* Status display */}
          <span data-testid="test-todo-status" aria-live="polite" style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {todo.status}
          </span>
        </div>

        {/* Due date & time */}
        <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span data-testid="test-todo-due-date" style={{ fontSize: 12, color: overdue && !isDone ? "#A32D2D" : "var(--color-text-secondary)" }}>
            {fmtDate(todo.dueDate)}
          </span>
          <span
            data-testid="test-todo-time-remaining"
            aria-live="polite"
            aria-atomic="true"
            style={{ fontSize: 12, color: isDone ? "var(--color-text-success)" : overdue ? "#A32D2D" : "var(--color-text-secondary)" }}
          >
            · {timeLabel}
          </span>
          {overdue && !isDone && (
            <span
              data-testid="test-todo-overdue-indicator"
              role="alert"
              aria-label="This task is overdue"
              style={{ display: "inline-block", background: "#FCEBEB", color: "#A32D2D", fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 999, border: "0.5px solid #E24B4A" }}
            >
              OVERDUE
            </span>
          )}
        </div>

        {/* Description (collapsible) */}
        {!isEditing && (
          <>
            <div
              data-testid="test-todo-collapsible-section"
              id="todo-collapsible-desc"
            >
              <p
                data-testid="test-todo-description"
                style={{ fontSize: 13, color: isDone ? "var(--color-text-tertiary)" : "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 8px", wordBreak: "break-word" }}
              >
                {visibleDesc}
              </p>
            </div>
            {longDesc && (
              <button
                data-testid="test-todo-expand-toggle"
                id="todo-expand-toggle"
                onClick={() => setExpanded(e => !e)}
                aria-expanded={expanded}
                aria-controls="todo-collapsible-desc"
                tabIndex={0}
                style={{ background: "none", border: "none", fontSize: 12, color: "var(--color-text-secondary)", cursor: "pointer", padding: 0, marginBottom: 10, textDecoration: "underline", fontFamily: mono }}
              >
                {expanded ? "Show less ↑" : "Show more ↓"}
              </button>
            )}
          </>
        )}

        {/* Edit Form */}
        {isEditing && (
          <div
            data-testid="test-todo-edit-form"
            role="form"
            aria-label="Edit todo"
            style={{ borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: 14, marginTop: 8, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label htmlFor="edit-title" style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>Title</label>
              <input
                id="edit-title"
                ref={firstRef}
                data-testid="test-todo-edit-title-input"
                type="text"
                value={draft.title}
                onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                style={{ fontSize: 13, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: mono, width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label htmlFor="edit-desc" style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>Description</label>
              <textarea
                id="edit-desc"
                data-testid="test-todo-edit-description-input"
                value={draft.description}
                onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                style={{ fontSize: 13, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: mono, width: "100%", boxSizing: "border-box", minHeight: 90, resize: "vertical", lineHeight: 1.5 }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label htmlFor="edit-priority" style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>Priority</label>
                <select
                  id="edit-priority"
                  data-testid="test-todo-edit-priority-select"
                  value={draft.priority}
                  onChange={e => setDraft(d => ({ ...d, priority: e.target.value }))}
                  style={{ fontSize: 13, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: mono }}
                >
                  {["Low", "Medium", "High"].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label htmlFor="edit-due" style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>Due date</label>
                <input
                  id="edit-due"
                  data-testid="test-todo-edit-due-date-input"
                  type="datetime-local"
                  value={draft.dueDate}
                  onChange={e => setDraft(d => ({ ...d, dueDate: e.target.value }))}
                  style={{ fontSize: 13, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: mono, width: "100%", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label htmlFor="edit-tags" style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>Tags (comma-separated)</label>
              <input
                id="edit-tags"
                data-testid="test-todo-edit-tags-input"
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                style={{ fontSize: 13, padding: "7px 10px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", fontFamily: mono, width: "100%", boxSizing: "border-box" }}
                placeholder="design, mobile, sprint-4"
              />
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                data-testid="test-todo-cancel-button"
                onClick={handleCancel}
                style={{ fontSize: 12, padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", cursor: "pointer", fontFamily: mono }}
              >
                Cancel
              </button>
              <button
                data-testid="test-todo-save-button"
                onClick={handleSave}
                style={{ fontSize: 12, padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #639922", background: "transparent", color: "#3B6D11", cursor: "pointer", fontFamily: mono, fontWeight: 500 }}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isEditing && (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button
              ref={editBtnRef}
              data-testid="test-todo-edit-button"
              onClick={openEdit}
              aria-label="Edit this todo"
              tabIndex={0}
              style={{ fontSize: 12, padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-secondary)", color: "var(--color-text-primary)", cursor: "pointer", fontFamily: mono }}
            >
              Edit
            </button>
            <button
              data-testid="test-todo-delete-button"
              onClick={() => setTodo(INITIAL_TODO)}
              aria-label="Delete this todo"
              tabIndex={0}
              style={{ fontSize: 12, padding: "5px 14px", borderRadius: "var(--border-radius-md)", border: "0.5px solid #E24B4A", background: "transparent", color: "#A32D2D", cursor: "pointer", fontFamily: mono }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Priority legend */}
      <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
        <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 500 }}>Priority legend</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(PRIORITY_CONFIG).map(([name, cfg]) => (
            <span key={name} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, padding: "3px 9px", borderRadius: "var(--border-radius-md)", background: cfg.bg, color: cfg.color, border: `0.5px solid ${cfg.border}` }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.dot }} />
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
