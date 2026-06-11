# Kora — Design System

## Direction
**Authority + Data Density.** Government fiscal audit platform. Power users (accountants, fiscal auditors). The work is serious and consequential — the UI must communicate precision, trust, and authority. Emotional job: control, confidence, clarity.

Not: warmth, playfulness, consumer-app friendliness.  
Comparable to: Bloomberg terminal × Linear × Notion.

## Foundation
- **Background**: `#F5F6F8` — cool neutral (not warm gray). Cooler tone implies precision.
- **Surface**: `#FFFFFF` — cards and panels sit on bg.
- **Sidebar**: `#1C1C1E` — dark, authoritative, always present.
- **Accent**: `#FFD700` (Kora brand gold) — used sparingly. Primary actions, active states, logo.

## Depth strategy
Shadow-as-border: `0 0 0 1px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.08)`.  
No dramatic shadows. Cards feel lifted, not floating.

## Tokens (index.css)
```
--gold:       #FFD700
--gold-dark:  #CCAC00
--gold-light: #FFE44D
--gold-faint: #FFFBE0
--dark:       #1C1C1E
--dark-2:     #2A2A2D
--bg:         #F5F6F8   ← cool neutral
--surface:    #FFFFFF
--surface-2:  #F7F7F7
--text:       #1A1A1A
--text-2:     #555555
--text-3:     #999999
--border:     #E4E5E9
--radius:     8px
--radius-sm:  6px
--sidebar-w:  240px
```

## Typography
- Font: Inter
- Headings: weight 650-700, letter-spacing -0.025em
- Body: weight 400-500
- Labels: 10-12px, weight 600, uppercase + tracking for table headers
- **Data values: always `font-variant-numeric: tabular-nums`**
- Scale: 10 / 11 / 12 / 12.5 / 13 / 14 / 20 / 22 / 32 / 38

## Spacing (4px grid)
4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 44 / 48

## Color for meaning only
Gray builds structure. Color signals status:
- `#EF4444` / `#FEF2F2` — critical / over limit
- `#F59E0B` / `#FFFBEB` — warning / near limit
- `#22C55E` / `#F0FDF4` — conforming / good
- `#3B82F6` / `#EFF6FF` — informational / in analysis
- `var(--gold)` — primary action / active nav / Kora brand

## Patterns established

### KPI Cards (stat cards)
Left-border accent (3px) by metric type. Large tabular number (32px 700). Muted label. Small delta line. No icon circles — numbers are the product. Critical metric (Irregularidades) gets `#FEF2F2` background tint.

### Alert rows (severity)
Left-border colored by severity (3px). Compact two-line row: description + municipality. Status badge (right, small). No big severity pill at front — the border communicates first. Hover gets a faint tint matching severity.

### Activity timeline
Vertical timeline with colored square dots (24px, 6px radius) + connector line. Icon inside dot. Body text right of track.

### LRF Chart (horizontal bars)
16px bar height, 3px radius. Limit line at 54%: 1.5px red vertical line. First row gets `::before` label "Limite 54%" above the line via CSS. Axis row below bars shows tick labels. Values right-aligned, tabular-nums, red when over limit.

### Data table
- Header: `surface-2` background, 10.5px uppercase tracking
- Rows: 11px border-bottom, hover `surface-2`
- Mini inline bar for percentage columns (pessoal)
- `tabular-nums` on all numeric cells
- Status badges: 20px pill radius, semantic colors

### Login page
Split screen: dark brand panel (440px) + white form panel (flex:1). Dark panel has subtle gold grid texture: `background-image: linear-gradient(rgba(255,215,0,0.04) 1px, transparent 1px), linear-gradient(90deg, ...) background-size: 40px 40px`. Logo top-left. Content bottom-third with gold eyebrow line.

## Anti-patterns (never)
- Icon circles on KPI cards
- Generic purple/blue gradients
- Spring/bounce animations
- `calc(54% / 70% * 100%)` style invalid CSS math — use `calc(54 / 70 * 100%)` or JS inline style
- Warm gray (`#F4F4F4`) for bg — use cool (`#F5F6F8`)
- Mixing border-radius systems (8px cards, 20px inputs, etc.)
- Numbers without tabular-nums in data-dense contexts
