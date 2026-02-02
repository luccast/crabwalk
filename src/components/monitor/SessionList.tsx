import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronLeft, ChevronRight, ChevronDown, Github } from "lucide-react";
import { StatusIndicator } from "./StatusIndicator";
import type { MonitorSession } from "~/integrations/openclaw";

function isSubagent(session: MonitorSession): boolean {
  return Boolean(session.spawnedBy) || session.platform === "subagent" || session.key.includes("subagent");
}

function XIcon({
  size = 14,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={["footer-icon-x", className].filter(Boolean).join(" ")}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
    </svg>
  );
}

interface SessionListProps {
  sessions: MonitorSession[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const platformEmoji: Record<string, string> = {
  whatsapp: "💬",
  telegram: "✈️",
  discord: "🎮",
  slack: "💼",
};

function SubagentItem({
  session,
  selected,
  collapsed,
  onSelect,
}: {
  session: MonitorSession;
  selected: boolean;
  collapsed: boolean;
  onSelect: (key: string) => void;
}) {
  return (
    <button
      onClick={() => onSelect(session.key)}
      className={`w-full text-left border-b border-shell-800/50 transition-all duration-150 group ${
        collapsed ? "p-2" : "py-2 pr-3 pl-6"
      } ${
        selected
          ? "bg-neon-cyan/5 border-l-2 border-l-neon-cyan"
          : "hover:bg-shell-800/30 border-l-2 border-l-transparent"
      }`}
      title={collapsed ? "subagent" : undefined}
    >
      {collapsed ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm">🤖</span>
          <StatusIndicator status={session.status} size="sm" />
        </div>
      ) : (
        <>
          <div className="font-display text-[9px] font-medium text-neon-cyan/60 uppercase tracking-widest mb-1">
            subagent
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">🤖</span>
            <span className="font-console text-[11px] text-shell-400 truncate flex-1 group-hover:text-shell-200">
              {session.recipient}
            </span>
            <StatusIndicator status={session.status} size="sm" />
          </div>
        </>
      )}
    </button>
  );
}

export function SessionList({
  sessions,
  selectedKey,
  onSelect,
  collapsed,
  onToggleCollapse,
}: SessionListProps) {
  const [filter, setFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const parentSessions = sessions.filter((s) => !isSubagent(s));
  const platforms = [...new Set(parentSessions.map((s) => s.platform))];

  const filteredParents = parentSessions.filter((session) => {
    const matchesText =
      !filter ||
      session.recipient.toLowerCase().includes(filter.toLowerCase()) ||
      session.agentId.toLowerCase().includes(filter.toLowerCase());
    const matchesPlatform =
      !platformFilter || session.platform === platformFilter;
    return matchesText && matchesPlatform;
  });

  // Sort: active first, then by lastActivityAt
  const sortedParents = [...filteredParents].sort((a, b) => {
    if (a.status !== "idle" && b.status === "idle") return -1;
    if (a.status === "idle" && b.status !== "idle") return 1;
    return b.lastActivityAt - a.lastActivityAt;
  });

  // Group subagents by parent key
  const { subagentsByParent, orphanSubagents } = useMemo(() => {
    const byParent = new Map<string, MonitorSession[]>();
    const orphans: MonitorSession[] = [];
    const parentKeys = new Set(parentSessions.map((s) => s.key));

    for (const session of sessions) {
      if (!isSubagent(session)) continue;
      const matchesFilter =
        !filter ||
        session.agentId.toLowerCase().includes(filter.toLowerCase()) ||
        "subagent".includes(filter.toLowerCase());
      if (!matchesFilter) continue;

      if (session.spawnedBy && parentKeys.has(session.spawnedBy)) {
        const list = byParent.get(session.spawnedBy) ?? [];
        list.push(session);
        byParent.set(session.spawnedBy, list);
      } else {
        orphans.push(session);
      }
    }

    // Sort subagents within each group by activity
    for (const [key, list] of byParent) {
      list.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
      byParent.set(key, list);
    }
    orphans.sort((a, b) => b.lastActivityAt - a.lastActivityAt);

    return { subagentsByParent: byParent, orphanSubagents: orphans };
  }, [sessions, parentSessions, filter]);

  return (
    <motion.div
      className="flex flex-col h-full bg-shell-900 relative"
      initial={false}
      animate={{ width: collapsed ? 56 : 288 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {/* Subtle texture */}
      <div className="absolute inset-0 texture-scanlines pointer-events-none opacity-50" />

      {/* Header */}
      <div className="relative p-3 bg-shell-950/50 overflow-hidden">
        <div className={`flex items-center mb-3 ${collapsed ? "justify-center" : "justify-between"}`}>
          <h2
            className={`font-mono uppercase text-sm text-crab-400 glow-red tracking-wider ml-1 transition-opacity duration-200 ${
              collapsed ? "opacity-0 absolute pointer-events-none" : "opacity-100"
            }`}
          >
            Sessions
          </h2>
          <button
            onClick={onToggleCollapse}
            className="p-1.5 hover:bg-shell-800 rounded transition-all"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={16} className="text-gray-400" />
            ) : (
              <ChevronLeft size={16} className="text-gray-400" />
            )}
          </button>
        </div>

        {/* Search input - fades when collapsed */}
        <div
          className={`transition-all duration-200 ${
            collapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
          }`}
        >
          <div className="relative">
            <input
              type="text"
              placeholder="Filter sessions..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-retro w-full pl-9 pr-3 py-2 text-xs"
              tabIndex={collapsed ? -1 : 0}
            />
          </div>

          {/* Platform filters */}
          {platforms.length > 1 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              <button
                onClick={() => setPlatformFilter(null)}
                tabIndex={collapsed ? -1 : 0}
                className={`px-2.5 py-1 text-[11px] font-display uppercase tracking-wide rounded border transition-all ${
                  !platformFilter
                    ? "bg-crab-600 border-crab-500 text-white box-glow-red"
                    : "bg-shell-800 border-shell-700 text-gray-400 hover:border-shell-600 hover:text-gray-300"
                }`}
              >
                All
              </button>
              {platforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatformFilter(p)}
                  tabIndex={collapsed ? -1 : 0}
                  className={`px-2.5 py-1 text-[11px] font-display uppercase tracking-wide rounded border transition-all ${
                    platformFilter === p
                      ? "bg-crab-600 border-crab-500 text-white box-glow-red"
                      : "bg-shell-800 border-shell-700 text-gray-400 hover:border-shell-600 hover:text-gray-300"
                  }`}
                >
                  {platformEmoji[p] || "📱"} {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session list */}
      <div className="relative flex-1 overflow-y-auto">
        <AnimatePresence mode="sync">
          {sortedParents.map((session) => (
            <motion.div
              key={session.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <button
                onClick={() => onSelect(session.key)}
                className={`w-full text-left p-3 border-b border-shell-800 transition-all duration-150 group ${
                  selectedKey === session.key
                    ? "bg-crab-900/20 border-l-2 border-l-crab-500"
                    : "hover:bg-shell-800/50 border-l-2 border-l-transparent"
                }`}
                title={
                  collapsed
                    ? `${session.recipient} (${session.platform})`
                    : undefined
                }
              >
                {collapsed ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg">
                      {platformEmoji[session.platform] || "📱"}
                    </span>
                    <StatusIndicator status={session.status} size="sm" />
                  </div>
                ) : (
                  <>
                    <div className="font-display text-[9px] font-medium text-shell-500 uppercase tracking-widest mb-1">
                      main
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">
                        {platformEmoji[session.platform] || "📱"}
                      </span>
                      <span className="font-display text-xs font-medium text-gray-200 truncate flex-1 uppercase tracking-wide group-hover:text-white">
                        {session.recipient}
                      </span>
                      <StatusIndicator status={session.status} size="sm" />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-console text-[11px] text-shell-500 truncate flex-1">
                        {session.agentId}
                      </span>
                      {session.isGroup && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 bg-shell-800 border border-shell-700 rounded text-[11px] text-shell-400">
                          <Users size={10} />
                          group
                        </span>
                      )}
                    </div>
                  </>
                )}
              </button>

              {/* Nested subagents */}
              {(() => {
                const subs = subagentsByParent.get(session.key);
                if (!subs?.length) return null;
                const isGroupCollapsed = collapsedGroups.has(session.key);
                return (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCollapsedGroups((prev) => {
                          const next = new Set(prev);
                          if (next.has(session.key)) next.delete(session.key);
                          else next.add(session.key);
                          return next;
                        });
                      }}
                      className={`w-full border-b border-shell-800/50 transition-all ${
                        collapsed ? "p-2 justify-center" : "px-4 py-1.5 text-left"
                      } flex items-center gap-1.5 text-xs font-display uppercase tracking-widest text-shell-500 hover:text-shell-300 hover:bg-shell-800/30`}
                    >
                      <ChevronDown
                        size={16}
                        className={`transition-transform ${isGroupCollapsed ? "-rotate-90" : ""} ${collapsed ? "ml-2" : ""}`}
                      />
                      <span className={`transition-opacity duration-200 ${collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}>
                        {subs.length} subagent{subs.length > 1 ? "s" : ""}
                      </span>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{
                        height: isGroupCollapsed ? 0 : "auto",
                        opacity: isGroupCollapsed ? 0 : 1,
                      }}
                      transition={{ duration: 0.15, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      {subs.map((sub) => (
                        <SubagentItem
                          key={sub.key}
                          session={sub}
                          selected={selectedKey === sub.key}
                          collapsed={collapsed}
                          onSelect={onSelect}
                        />
                      ))}
                    </motion.div>
                  </>
                );
              })()}
            </motion.div>
          ))}

          {/* Orphan subagents */}
          {orphanSubagents.map((sub) => (
            <motion.div
              key={sub.key}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SubagentItem
                session={sub}
                selected={selectedKey === sub.key}
                collapsed={collapsed}
                onSelect={onSelect}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {sortedParents.length === 0 && orphanSubagents.length === 0 && (
          <div className={`p-6 text-center transition-opacity duration-200 ${collapsed ? "opacity-0" : "opacity-100"}`}>
            <div className="font-console text-xs text-shell-500">
              <span className="text-crab-600">&gt;</span> no sessions found
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`relative bg-shell-950/50 ${collapsed ? "py-3 px-2" : "p-2.5"}`}>
        <div className={`font-console text-xs text-shell-500 text-center flex items-center justify-center ${collapsed ? "flex-col gap-3" : "gap-4"}`}>
          <a
            href="https://github.com/luccast/crabwalk"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-shell-500 hover:text-crab-500 transition-colors"
            title="Github"
          >
            <Github size={14} />
            <span className={`transition-opacity duration-200 ${collapsed ? "hidden" : "opacity-100"}`}>
              Github
            </span>
          </a>

          <a
            href="https://x.com/luccasveg"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-shell-500 hover:text-crab-500 transition-colors"
            aria-label="X"
            title="X"
          >
            <XIcon size={14} />
            <span className={`transition-opacity duration-200 ${collapsed ? "hidden" : "opacity-100"}`}>
              @luccasveg
            </span>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
