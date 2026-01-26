import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronLeft, ChevronRight, Github } from "lucide-react";
import { StatusIndicator } from "./StatusIndicator";
import type { MonitorSession } from "~/integrations/clawdbot";

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

export function SessionList({
  sessions,
  selectedKey,
  onSelect,
  collapsed,
  onToggleCollapse,
}: SessionListProps) {
  const [filter, setFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);

  const platforms = [...new Set(sessions.map((s) => s.platform))];

  const filteredSessions = sessions.filter((session) => {
    const matchesText =
      !filter ||
      session.recipient.toLowerCase().includes(filter.toLowerCase()) ||
      session.agentId.toLowerCase().includes(filter.toLowerCase());
    const matchesPlatform =
      !platformFilter || session.platform === platformFilter;
    return matchesText && matchesPlatform;
  });

  // Sort: active first, then by lastActivityAt
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (a.status !== "idle" && b.status === "idle") return -1;
    if (a.status === "idle" && b.status !== "idle") return 1;
    return b.lastActivityAt - a.lastActivityAt;
  });

  return (
    <motion.div
      className="flex flex-col h-full bg-shell-900 border-r-2 border-shell-700 relative"
      initial={false}
      animate={{ width: collapsed ? 56 : 288 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {/* Subtle texture */}
      <div className="absolute inset-0 texture-scanlines pointer-events-none opacity-50" />

      {/* Header */}
      <div className="relative p-3 border-b-2 border-shell-700 bg-shell-950/50">
        <div className="flex items-center justify-between mb-3">
          {!collapsed && (
            <h2 className="font-mono uppercase text-sm text-crab-400 glow-red tracking-wider ml-1">
              Sessions
            </h2>
          )}
          <button
            onClick={onToggleCollapse}
            className={`p-1.5 hover:bg-shell-800 rounded border border-transparent hover:border-shell-600 transition-all ${collapsed ? "mx-auto" : ""}`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight size={16} className="text-gray-400" />
            ) : (
              <ChevronLeft size={16} className="text-gray-400" />
            )}
          </button>
        </div>

        {/* Search input - hidden when collapsed */}
        {!collapsed && (
          <>
            <div className="relative">
              <input
                type="text"
                placeholder="Filter sessions..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input-retro w-full pl-9 pr-3 py-2 text-xs"
              />
            </div>

            {/* Platform filters */}
            {platforms.length > 1 && (
              <div className="flex gap-1.5 mt-3 flex-wrap">
                <button
                  onClick={() => setPlatformFilter(null)}
                  className={`px-2.5 py-1 text-[10px] font-display uppercase tracking-wide rounded border transition-all ${
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
                    className={`px-2.5 py-1 text-[10px] font-display uppercase tracking-wide rounded border transition-all ${
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
          </>
        )}
      </div>

      {/* Session list */}
      <div className="relative flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {sortedSessions.map((session) => (
            <motion.button
              key={session.key}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
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
                // Collapsed view: just icon and status
                <div className="flex flex-col items-center gap-1">
                  <span className="text-lg">
                    {platformEmoji[session.platform] || "📱"}
                  </span>
                  <StatusIndicator status={session.status} size="sm" />
                </div>
              ) : (
                // Expanded view
                <>
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
                    <span className="font-console text-[10px] text-shell-500 truncate flex-1">
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
            </motion.button>
          ))}
        </AnimatePresence>

        {sortedSessions.length === 0 && !collapsed && (
          <div className="p-6 text-center">
            <div className="font-console text-xs text-shell-500">
              <span className="text-crab-600">&gt;</span> no sessions found
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative p-2.5 border-t-2 border-shell-700 bg-shell-950/50">
        <div className="font-console text-xs text-shell-500 text-center flex items-center justify-center gap-4">
          <a
            href="https://github.com/luccast/crabwalk"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-neon-mint hover:text-neon-mint/80 transition-colors"
          >
            <Github size={14} className="text-shell-500" />
            Github
          </a>

          <a
            href="https://x.com/luccasveg"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-neon-mint hover:text-neon-mint/80 transition-colors"
            aria-label="X"
            title="X"
          >
            <XIcon size={14} className="text-shell-500" />
            @luccasveg
          </a>
        </div>
      </div>
    </motion.div>
  );
}
