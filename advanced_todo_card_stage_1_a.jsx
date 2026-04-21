import { useState, useEffect, useRef } from "react";

export default function TodoCard() {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState("Pending");
  const [todo, setTodo] = useState({
    title: "Sample Task",
    description: "This is a long description for the todo task. It demonstrates expand and collapse behavior for accessibility and usability.",
    priority: "Medium",
    dueDate: new Date(Date.now() + 3600 * 1000 * 5) // 5 hours ahead
  });

  const [timeText, setTimeText] = useState("");

  const editRef = useRef(null);

  // Time logic
  useEffect(() => {
    if (status === "Done") {
      setTimeText("Completed");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = new Date(todo.dueDate) - now;

      if (diff < 0) {
        const mins = Math.floor(Math.abs(diff) / 60000);
        setTimeText(`Overdue by ${mins} minutes`);
      } else if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        setTimeText(`Due in ${mins} minutes`);
      } else if (diff < 86400000) {
        const hrs = Math.floor(diff / 3600000);
        setTimeText(`Due in ${hrs} hours`);
      } else {
        const days = Math.floor(diff / 86400000);
        setTimeText(`Due in ${days} days`);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [todo.dueDate, status]);

  const isOverdue = status !== "Done" && new Date(todo.dueDate) < new Date();

  const handleSave = () => setEditing(false);
  const handleCancel = () => setEditing(false);

  const priorityColor = {
    Low: "border-green-500",
    Medium: "border-yellow-500",
    High: "border-red-500"
  }[todo.priority];

  return (
    <div className={`p-4 border-l-4 ${priorityColor} rounded shadow-md max-w-xl mx-auto`}>

      {!editing ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className={`text-xl font-bold ${status === "Done" ? "line-through text-gray-400" : ""}`}>
              {todo.title}
            </h2>

            <select
              data-testid="test-todo-status-control"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option>Pending</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>
          </div>

          <div
            data-testid="test-todo-priority-indicator"
            className="text-sm mt-1"
          >
            Priority: {todo.priority}
          </div>

          <div
            data-testid="test-todo-collapsible-section"
            id="desc"
            className={`${expanded ? "" : "line-clamp-2"}`}
          >
            {todo.description}
          </div>

          <button
            data-testid="test-todo-expand-toggle"
            aria-expanded={expanded}
            aria-controls="desc"
            onClick={() => setExpanded(!expanded)}
            className="text-blue-500"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>

          <div aria-live="polite" className="mt-2">
            {timeText}
          </div>

          {isOverdue && (
            <div
              data-testid="test-todo-overdue-indicator"
              className="text-red-500"
            >
              Overdue
            </div>
          )}

          <button onClick={() => setEditing(true)}>Edit</button>
        </>
      ) : (
        <div data-testid="test-todo-edit-form" ref={editRef}>
          <label>
            Title
            <input
              data-testid="test-todo-edit-title-input"
              value={todo.title}
              onChange={(e) => setTodo({ ...todo, title: e.target.value })}
            />
          </label>

          <label>
            Description
            <textarea
              data-testid="test-todo-edit-description-input"
              value={todo.description}
              onChange={(e) => setTodo({ ...todo, description: e.target.value })}
            />
          </label>

          <label>
            Priority
            <select
              data-testid="test-todo-edit-priority-select"
              value={todo.priority}
              onChange={(e) => setTodo({ ...todo, priority: e.target.value })}
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>

          <label>
            Due Date
            <input
              type="datetime-local"
              data-testid="test-todo-edit-due-date-input"
              onChange={(e) => setTodo({ ...todo, dueDate: e.target.value })}
            />
          </label>

          <div>
            <button
              data-testid="test-todo-save-button"
              onClick={handleSave}
            >
              Save
            </button>

            <button
              data-testid="test-todo-cancel-button"
              onClick={handleCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
