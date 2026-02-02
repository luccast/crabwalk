# Crabwalk Design System

## Aesthetic Direction: **Terminal Control Panel**

A command-line inspired interface that feels like operating a sophisticated monitoring system. Clean, precise, information-dense but not cluttered. The aesthetic borrows from terminal emulators, mission control panels, and developer tools—functional beauty.

---

## Core Principles

### 1. Information Hierarchy Through Typography
- **Labels**: Tiny, uppercase, muted (`text-[10px] text-shell-500 uppercase tracking-widest`)
- **Values**: Slightly larger, brighter (`text-xs text-gray-300`)
- **Key Metrics**: Accent colors with the display font (`text-sm text-neon-mint`)
- **Actions**: Console font, tracking-wider (`font-console tracking-wider`)

### 2. Contained Modules
Every piece of information lives in a clearly bounded container:
- `bg-shell-900/95` or `bg-shell-800/50` backgrounds
- `border border-shell-700/80` borders
- `rounded-lg` corners (8px)
- `backdrop-blur-sm` for layered elements

### 3. Status Through Color
| State | Color | CSS Class |
|-------|-------|-----------|
| Active/Connected | Mint | `text-neon-mint`, `bg-neon-mint/10` |
| Warning/Processing | Peach | `text-neon-peach`, `bg-neon-peach/10` |
| Error/Primary Action | Crab Red | `text-crab-400`, `bg-crab-500/15` |
| Inactive/Muted | Shell Gray | `text-shell-500`, `bg-shell-800` |

### 4. Pulse Indicators
Small animated dots communicate live status:
```tsx
<span className="w-1.5 h-1.5 rounded-full bg-neon-mint animate-pulse" />
```

### 5. Traffic Light Decorations
Decorative dots that reference classic window controls, add personality:
```tsx
<div className="flex items-center gap-1.5">
  <div className="w-2 h-2 rounded-full bg-crab-500/80" />
  <div className="w-2 h-2 rounded-full bg-neon-peach/80" />
  <div className="w-2 h-2 rounded-full bg-neon-mint/80" />
</div>
```

---

## Color Palette

### Primary: Crab Reds
```css
--color-crab-400: #f87171;  /* Text accents */
--color-crab-500: #ef4444;  /* Primary actions */
--color-crab-600: #dc2626;  /* Buttons */
--color-crab-900: #7f1d1d;  /* Backgrounds */
```

### Backgrounds: Shell Darks
```css
--color-shell-950: #0a0a0f;  /* Page background */
--color-shell-900: #12121a;  /* Card backgrounds */
--color-shell-800: #1a1a26;  /* Input backgrounds */
--color-shell-700: #252535;  /* Borders */
--color-shell-500: #52526e;  /* Muted text */
```

### Accents: Neon Status
```css
--color-neon-mint: #98ffc8;   /* Success, active, connected */
--color-neon-peach: #ffb088;  /* Warning, processing */
--color-neon-coral: #ff6b6b;  /* Attention */
--color-neon-cyan: #00ffff;   /* Special highlights */
```

---

## Typography

### Font Stack
```css
--font-arcade: 'Press Start 2P';  /* Headlines only, sparingly */
--font-console: 'JetBrains Mono'; /* Primary UI font */
```

### Type Scale
| Use Case | Size | Weight | Tracking |
|----------|------|--------|----------|
| Micro labels | `text-[9px]` | Regular | `tracking-widest` |
| Labels | `text-[10px]` | Regular | `tracking-widest` |
| Body/UI | `text-xs` (12px) | Regular | `tracking-wider` |
| Values | `text-sm` (14px) | Medium | Default |
| Headers | `text-base` (16px) | Semibold | Default |

---

## Component Patterns

### Status Pill
```tsx
<div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
  active
    ? 'bg-neon-mint/10 border-neon-mint/30'
    : 'bg-shell-800/50 border-shell-700'
}`}>
  <span className={`w-1.5 h-1.5 rounded-full ${
    active ? 'bg-neon-mint animate-pulse' : 'bg-shell-600'
  }`} />
  <span className={`font-console text-xs ${
    active ? 'text-neon-mint' : 'text-shell-500'
  }`}>
    {active ? 'CONNECTED' : 'DISCONNECTED'}
  </span>
</div>
```

### Stat Block
```tsx
<div className="flex items-center gap-2">
  <span className="font-console text-[10px] text-shell-500 uppercase">
    Sessions
  </span>
  <span className="font-console text-sm text-neon-mint">
    {count}
  </span>
</div>
```

### Keyboard Shortcut Badge
```tsx
<kbd className="px-1.5 py-0.5 bg-shell-800 border border-shell-700 rounded text-[9px] font-console text-shell-500">
  ALT
</kbd>
```

### Section Divider (Vertical)
```tsx
<div className="w-px h-4 bg-shell-700" />
```

### Icon Container
```tsx
<div className="p-1.5 rounded-md bg-shell-800 text-shell-500">
  <Icon size={14} />
</div>
```

### Input Field
```tsx
<div className="relative">
  <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-shell-500" size={16} />
  <input className="w-full bg-shell-800 border border-shell-700 rounded-lg pl-9 pr-3 py-2 text-sm font-console text-gray-200 placeholder-shell-500 focus:outline-none focus:border-crab-500 focus:ring-1 focus:ring-crab-500/20" />
</div>
```

### Action Button (Primary)
```tsx
<button className="px-3 py-1.5 bg-crab-600 hover:bg-crab-500 text-white text-sm font-console rounded-lg transition-colors">
  Action
</button>
```

### Action Button (Ghost)
```tsx
<button className="p-2 hover:bg-shell-800 rounded-lg transition-colors border border-transparent hover:border-shell-600 group">
  <Icon size={16} className="text-shell-400 group-hover:text-crab-400" />
</button>
```

---

## Animation Guidelines

### Timing Functions
- **Snappy interactions**: `duration-150`
- **Smooth transitions**: `duration-200`
- **Entrance animations**: `duration-300`

### Motion Presets
```tsx
// Panel entrance
initial={{ opacity: 0, y: -10, scale: 0.95 }}
animate={{ opacity: 1, y: 0, scale: 1 }}
transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}

// Fade backdrop
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
transition={{ duration: 0.15 }}

// Staggered list items
transition={{ duration: 0.2, delay: index * 0.05 }}

// Rotating loader
animate={{ rotate: 360 }}
transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
```

---

## Layout Patterns

### Floating HUD System

The interface uses a floating HUD (Heads-Up Display) approach where controls hover over content rather than occupying fixed header space. This creates a more immersive, cockpit-like experience.

```
┌─────────────────────────────────────────────────────────────┐
│ [Nav]  [Status Panel]    [Input Bar]    [Stats & Actions]   │  ← Floating panels
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    Content flows beneath                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key principles:**
- Panels are `fixed` position with `pointer-events-none` on container
- Individual panels have `pointer-events-auto` to remain interactive
- Content has `pt-16` padding to avoid initial overlap
- Panels use `backdrop-blur-md` and `bg-shell-900/95` for glass effect
- Staggered entrance animations (`delay: 0.05, 0.1, 0.15...`)

### Floating Panel Styling
```tsx
<div className="px-3 py-2 bg-shell-900/95 backdrop-blur-md border border-shell-700/80 rounded-lg shadow-lg shadow-black/20">
  {children}
</div>
```

### Nav Spacer
All pages need a spacer to account for the fixed CommandNav button:
```tsx
<div className="w-56 sm:w-64 shrink-0" />
```

### Z-Index Layers
| Layer | Z-Index | Use |
|-------|---------|-----|
| Base content | 0 | Main content area |
| In-page controls | 10 | Graph controls, sticky headers |
| Header | 30 | App header bar |
| Toolbar | 40 | Mobile bottom toolbar |
| Navigation backdrop | 40 | CommandNav backdrop |
| Navigation/drawers | 50 | CommandNav panel, mobile drawers |
| Settings backdrop | 60 | Settings panel backdrop |
| Settings panel | 70 | Settings panel (top layer) |

---

## Iconography

Use **Lucide React** icons exclusively. Preferred sizes:
- Inline with text: `14px`
- Standalone buttons: `16-18px`
- Feature icons: `20px`
- Loading states: `20px`

Icon style: Stroke-based, 2px stroke width (Lucide default).

---

## Responsive Behavior

### Breakpoints
- `sm:` (640px) - Mobile/desktop split
- Headers hide on mobile, replaced by bottom toolbar
- Stats/secondary info hidden on mobile

### Mobile Patterns
- Bottom fixed toolbar for primary actions
- Slide-up sheets for forms
- Slide-in drawers for navigation lists
- Larger touch targets (min 44x44px)

---

## Loading States

### Page Loading
Geometric spinner with context icon:
```tsx
<div className="relative w-16 h-16">
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
    className="absolute inset-0 border-2 border-shell-700 border-t-crab-500 rounded-lg"
  />
  <div className="absolute inset-2 bg-shell-900 rounded flex items-center justify-center">
    <ContextIcon size={20} className="text-crab-400" />
  </div>
</div>
```

### Inline Loading
```tsx
<RefreshCw size={14} className="animate-spin text-shell-500" />
```

### Connection Retry
```tsx
<div className="flex items-center gap-2">
  <Loader2 size={14} className="animate-spin text-neon-peach" />
  <span className="font-console text-xs text-shell-400">
    retrying ({count}/{max})...
  </span>
</div>
```

---

## Do's and Don'ts

### Do
- Use monospace font for all UI text
- Keep labels uppercase and tiny
- Use color to indicate state, not decoration
- Add subtle borders to define boundaries
- Include keyboard shortcuts for power users
- Use backdrop blur for layered elements

### Don't
- Use large, bold headers
- Add decorative gradients without purpose
- Use more than 2-3 accent colors per view
- Animate everything—be selective
- Use rounded-full except for status dots
- Mix different font families

---

## File Organization

```
src/
├── components/
│   ├── navigation/     # Global nav system
│   ├── monitor/        # Monitor-specific components
│   ├── workspace/      # Workspace-specific components
│   └── ui/             # Shared UI primitives (future)
├── hooks/
│   └── useIsMobile.ts  # Responsive detection
└── styles.css          # Global styles & CSS variables
```
