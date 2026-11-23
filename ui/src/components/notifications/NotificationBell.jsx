import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../services";

const POLL_MS = 30_000;
const LIST_LIMIT = 30;

const TYPE_STYLES = {
  success: "border-l-green-600",
  warning: "border-l-yellow-500",
  error: "border-l-red-600",
  info: "border-l-blue-500",
};

/**
 * Notification bell + dropdown.
 *
 * Concurrency rules (so a slow poll can never undo what the person just did):
 *  - every poll is tagged with a sequence number; only the newest one may
 *    write state
 *  - any local change (mark read / mark all read) bumps `mutationRef`; a poll
 *    that STARTED before that change is discarded, and a fresh poll runs
 *    after the change is confirmed by the server
 *  - changes are applied optimistically and rolled back per item if the
 *    request fails
 */
export default function NotificationBell({ iconClassName = "w-6 h-6" }) {
  const panelId = useId();

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [markingAll, setMarkingAll] = useState(false);

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const seqRef = useRef(0);
  const mutationRef = useRef(0);
  const mountedRef = useRef(true);

  // Latest values for use inside async callbacks.
  const itemsRef = useRef(items);
  const unreadRef = useRef(unread);
  const pendingRef = useRef(pendingIds);
  const markingAllRef = useRef(markingAll);

  useEffect(() => {
    itemsRef.current = items;
    unreadRef.current = unread;
    pendingRef.current = pendingIds;
    markingAllRef.current = markingAll;
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const seq = ++seqRef.current;
    const mutationAtStart = mutationRef.current;

    try {
      const [list, count] = await Promise.all([
        getNotifications({ limit: LIST_LIMIT }),
        getUnreadCount(),
      ]);

      // Stale: a newer poll started, or the person changed something while
      // this request was in flight. Drop it.
      if (
        !mountedRef.current ||
        seq !== seqRef.current ||
        mutationAtStart !== mutationRef.current
      ) {
        return;
      }

      setItems(list);
      setUnread(count.unread);
      setLoadError("");
    } catch (err) {
      console.error("Failed to load notifications", err);

      if (mountedRef.current && seq === seqRef.current) {
        setLoadError("Couldn't load notifications.");
      }
    } finally {
      if (mountedRef.current && seq === seqRef.current) setLoading(false);
    }
  }, []);

  // Initial load + polling (paused while the tab is hidden).
  useEffect(() => {
    // Deferred so the first fetch isn't a synchronous setState-in-effect.
    const initial = setTimeout(refresh, 0);

    const tick = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  // Close on outside click / Escape (focus goes back to the bell).
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    setOpen((value) => {
      if (!value) refresh();
      return !value;
    });
  };

  const handleMarkRead = async (id) => {
    const target = itemsRef.current.find((n) => n.id === id);

    if (!target || target.isRead) return;
    if (pendingRef.current.has(id) || markingAllRef.current) return;

    setActionError("");
    mutationRef.current++;

    // Optimistic update.
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnread((c) => Math.max(0, c - 1));
    setPendingIds((prev) => new Set(prev).add(id));

    try {
      const updated = await markNotificationRead(id);

      if (!mountedRef.current) return;

      setItems((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (err) {
      console.error("Failed to mark notification as read", err);

      if (!mountedRef.current) return;

      // Roll back just this item.
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
      );
      setUnread((c) => c + 1);
      setActionError(
        err.response?.status === 404
          ? "That notification no longer exists."
          : "Couldn't mark the notification as read. Try again.",
      );
    } finally {
      if (mountedRef.current) {
        setPendingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }

      mutationRef.current++;
      refresh(); // reconcile with the server
    }
  };

  const handleMarkAll = async () => {
    if (markingAllRef.current || unreadRef.current === 0) return;

    const previouslyUnread = new Set(
      itemsRef.current.filter((n) => !n.isRead).map((n) => n.id),
    );
    const previousCount = unreadRef.current;

    setActionError("");
    mutationRef.current++;
    setMarkingAll(true);

    // Optimistic update.
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);

    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error("Failed to mark all notifications as read", err);

      if (mountedRef.current) {
        // Roll back: restore exactly the items that were unread.
        setItems((prev) =>
          prev.map((n) =>
            previouslyUnread.has(n.id) ? { ...n, isRead: false } : n,
          ),
        );
        setUnread(previousCount);
        setActionError("Couldn't mark all as read. Try again.");
      }
    } finally {
      if (mountedRef.current) setMarkingAll(false);

      mutationRef.current++;
      refresh();
    }
  };

  const badge = unread > 99 ? "99+" : String(unread);

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        className="relative p-1.5 rounded-full hover:bg-[var(--os-nav-hover)] focus-visible:bg-[var(--os-nav-hover)] transition-colors"
      >
        <img
          src="/icons/bell_ribbon.png"
          alt=""
          aria-hidden="true"
          className={`${iconClassName} object-contain`}
        />

        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 text-[10px] leading-4 text-center bg-orange-500 text-white rounded-full"
          >
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 max-w-[90vw] z-50 os-card shadow-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Notifications</h2>

            <button
              type="button"
              onClick={handleMarkAll}
              disabled={markingAll || unread === 0}
              className="text-xs underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
            >
              {markingAll ? "Marking..." : "Mark all as read"}
            </button>
          </div>

          {actionError && (
            <p role="alert" className="text-xs text-red-600 mb-2">
              {actionError}
            </p>
          )}

          {loading && (
            <p role="status" className="text-xs opacity-70 py-4 text-center">
              Loading notifications...
            </p>
          )}

          {!loading && loadError && (
            <div role="alert" className="text-xs text-red-600 py-3 text-center">
              {loadError}{" "}
              <button type="button" onClick={refresh} className="underline">
                Retry
              </button>
            </div>
          )}

          {!loading && !loadError && items.length === 0 && (
            <p className="text-xs opacity-70 py-4 text-center">
              You&apos;re all caught up.
            </p>
          )}

          {items.length > 0 && (
            <ul className="max-h-80 overflow-y-auto divide-y divide-[var(--os-border-soft)]">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={`py-2 pl-2 border-l-4 ${
                    TYPE_STYLES[n.type] || TYPE_STYLES.info
                  } ${n.isRead ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {!n.isRead && (
                          <span className="sr-only">Unread: </span>
                        )}
                        {n.title}
                      </p>
                      <p className="text-xs opacity-80 break-words">
                        {n.message}
                      </p>
                      <p className="text-[11px] opacity-60 mt-0.5">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        disabled={pendingIds.has(n.id) || markingAll}
                        aria-label={`Mark "${n.title}" as read`}
                        className="shrink-0 text-xs underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                      >
                        {pendingIds.has(n.id) ? "..." : "Mark read"}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
