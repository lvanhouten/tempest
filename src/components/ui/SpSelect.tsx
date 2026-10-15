import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { UiIcon } from "../../icons/UiIcon";
const ChevronDown = (p: any) => <UiIcon name="chevron-down" {...p} />;
import "./SpSelect.css";

export type SpSelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  /** With `searchable`, stays visible whatever the query (e.g. "All", "Load more…"). */
  pinned?: boolean;
};

export function SpSelect({ value, options, onChange, className, searchable, searchPlaceholder }: {
  value: string;
  options: SpSelectOption[];
  onChange: (v: string) => void;
  className?: string;
  /** Adds a filter input at the top of the menu — for long option lists. */
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  // Menu is portaled + position:fixed off the button's viewport rect, so it never
  // clips inside overflow:hidden parents (canvas nodes) and isn't scaled by canvas zoom.
  const [rect, setRect] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null);
  const current = options.find((o) => o.value === value);
  const label = current?.label ?? value;
  const q = query.trim().toLowerCase();
  const shown = searchable && q
    ? options.filter((o) => o.pinned || o.label.toLowerCase().includes(q))
    : options;

  const close = () => { setOpen(false); setQuery(""); };
  const choose = (v: string) => { onChange(v); close(); };

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    // Estimated menu height: 26px per row + 6px padding, capped at the CSS
    // max-height (240). Flip upward when the space below the button is less
    // than the menu wants AND there's more room above — matches shadcn.
    // The search row adds ~34px. A flipped menu is anchored by its bottom edge
    // so it stays attached to the button as filtering shrinks it.
    const menuH = Math.min(240, options.length * 26 + 6) + (searchable ? 34 : 0);
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    const flipUp = below < menuH + 8 && above > below;
    setRect(flipUp
      ? { left: r.left, bottom: window.innerHeight - r.top + 3, width: r.width }
      : { left: r.left, top: r.bottom + 3, width: r.width });
  }, [open, options.length, searchable]);

  return (
    <div className={`sp-drop${className ? " " + className : ""}`}>
      <button
        ref={btnRef}
        className={`sp-drop-btn${open ? " sp-drop-btn--open" : ""}`}
        onClick={(e) => { e.stopPropagation(); if (open) close(); else setOpen(true); }}
        type="button"
      >
        {current?.icon && <span className="sp-drop-icon">{current.icon}</span>}
        <span className="sp-drop-label">{label}</span>
        <ChevronDown size={11} className="sp-drop-chevron" />
      </button>
      {open && rect && createPortal(
        <>
          <div className="sp-drop-overlay" onMouseDown={close} />
          <div
            className={`sp-drop-menu nodrag nowheel${searchable ? " sp-drop-menu--search" : ""}`}
            style={{ position: "fixed", left: rect.left, top: rect.top, bottom: rect.bottom, minWidth: rect.width }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {searchable && (
              <input
                className="sp-drop-search"
                autoFocus
                placeholder={searchPlaceholder ?? "Search…"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") { e.preventDefault(); close(); }
                  // Enter takes the first real match, not a pinned entry.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const hit = shown.find((o) => !o.pinned) ?? shown[0];
                    if (hit) choose(hit.value);
                  }
                }}
              />
            )}
            <div className="sp-drop-list">
              {shown.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`sp-drop-item${o.value === value ? " sp-drop-item--active" : ""}`}
                  onClick={() => choose(o.value)}
                >
                  {o.icon && <span className="sp-drop-icon">{o.icon}</span>}
                  <span className="sp-drop-label">{o.label}</span>
                </button>
              ))}
              {searchable && q && !shown.some((o) => !o.pinned) && (
                <div className="sp-drop-empty">No matches</div>
              )}
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
