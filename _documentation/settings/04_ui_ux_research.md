# Settings UI/UX Research - 2025 Best Practices

Research findings on optimal UI patterns for settings interfaces in web applications.

---

## Key Findings

### Modal vs Page vs Drawer Decision Matrix

| Pattern | Best For | Avoid When |
|---------|----------|------------|
| **Modal** | Focused single-task flows, confirmations, critical actions | Complex forms, explorable content, frequent access |
| **Drawer/Slide-out** | Settings panels, filters, contextual tasks, chat | Primary navigation, main content |
| **Separate Page** | Comprehensive settings with many sections, rarely accessed | Quick adjustments, context-dependent settings |
| **Inline** | Quick toggles, simple preferences, frequently used | Complex configuration, multi-field forms |

### When to Use Each Pattern

#### Modals
- Confirmation of destructive/irreversible actions
- Security acknowledgments (API key validation)
- Focused step-by-step configuration (e.g., exchange setup wizard)
- Critical information requiring immediate attention

**Key Rule**: "Modals are purposefully interruptive and should be used sparingly"

#### Drawers/Slide-out Panels
- Secondary sections like settings, user profiles, notifications
- Contextual tasks where user needs to reference main content
- Filter/sort panels
- Help & support panels

**Key Rule**: "The side drawer allows you to save on valuable screen real estate by neatly storing secondary navigation links"

#### Inline Settings
- Toggle switches for on/off preferences
- Quick-access frequently used settings
- Status indicators with edit capability

---

## Recommended Pattern for 247 Terminal

Based on research and the existing v2 codebase:

### Exchange Configuration: **Dropdown Panel (Left Side)**
- Click exchange icon in header → Panel expands below on left side
- Same styling as blocks menu and rig selector (consistent UI)
- Panel contains API key/secret fields for that specific exchange
- Includes validation/connection test button
- Visual feedback: Icon turns red when connected, dimmed when disconnected
- Dropdown pattern chosen to match existing UI:
  - Consistent with blocks menu and rig selector
  - Non-intrusive, doesn't block main view
  - Click outside or Escape to close
  - Opens on left side where exchange icons are located

### General Settings: **Right-Side Drawer**
- Settings gear icon in header → Opens slide-out drawer from right
- Drawer contains categorized settings in accordion/tabs
- Stays open while user can still see main trading interface
- Drawer pattern appropriate because:
  - Contains multiple categories of settings
  - User may want to reference main UI while adjusting
  - Less disruptive than full page navigation
  - "Slide-in panels or drawers – Good for non-blocking interactions like settings menus"

### Quick Settings: **Inline in Header/Toolbar**
- Theme toggle (already implemented)
- Layout lock toggle (already implemented)
- Sound on/off toggle

---

## Exchange Dropdown Panel Design

### Structure (matches blocks_menu.tsx / rig_selector.tsx style)
```
Header: [Blofin] [Binance] [HL] [Bybit]  ...
              ↓
        ┌──────────────────────────────┐
        │  BYBIT SETUP                 │
        ├──────────────────────────────┤
        │                              │
        │  API KEY                     │
        │  ┌────────────────────┐      │
        │  │ ●●●●●●●●●●●●●   👁 │      │
        │  └────────────────────┘      │
        │                              │
        │  API SECRET                  │
        │  ┌────────────────────┐      │
        │  │ ●●●●●●●●●●●●●   👁 │      │
        │  └────────────────────┘      │
        │                              │
        │  ☐ HEDGE MODE                │
        │                              │
        │  ┌────────────────────────┐  │
        │  │   TEST & CONNECT       │  │
        │  └────────────────────────┘  │
        │                              │
        │  [?] How to get API keys     │
        │                              │
        │  DISCONNECT                  │
        └──────────────────────────────┘
```

### Styling (consistent with existing menus)
- `fixed top-10 left-0` - Opens below header on left side
- `bg-base-100` - Same background as other dropdowns
- `shadow-lg rounded` - Consistent shadow and rounding
- `text-xs tracking-wide` - Same text styling
- `w-64` - Slightly wider to fit form fields

### States
1. **Empty/Disconnected**: Form fields empty, "Connect" button
2. **Filled/Disconnected**: Keys entered but not validated
3. **Testing**: Loading spinner, "Testing..."
4. **Connected**: Success checkmark, icon turns red
5. **Error**: Error message, input border turns red

### Visual Feedback on Header
- **Connected**: Icon shows in red (`text-error`) with full opacity
- **Disconnected**: Icon is dimmed/grayed out (`text-base-content/25`)
- **Preferred Exchange**: Small indicator dot or underline

---

## Settings Drawer Design

### Structure
```
Main App                          │ Settings Drawer
─────────────────────────────────┼──────────────────────────
[Header with exchange icons]      │ ┌────────────────────┐
                                  │ │ Settings      [X]  │
[Trading Interface]               │ ├────────────────────┤
                                  │ │ ▼ Trading          │
[Charts] [News] [Positions]       │ │   Size 1: [100]    │
                                  │ │   Size 2: [500]    │
                                  │ │   Slippage: [3%]   │
                                  │ │   ☐ Auto TP        │
                                  │ ├────────────────────┤
                                  │ │ ▶ Terminal         │
                                  │ ├────────────────────┤
                                  │ │ ▶ Chart            │
                                  │ ├────────────────────┤
                                  │ │ ▶ News             │
                                  │ ├────────────────────┤
                                  │ │ ▶ Backup           │
                                  │ └────────────────────┘
```

### Categories (Accordion/Collapsible)
1. **Trading** - Sizes, slippage, TP/SL
2. **Terminal** - Notifications, display options
3. **Chart** - Colors, timeframe, order history
4. **News** - Provider keys, display settings, keywords
5. **Shortcuts** - Keyboard bindings
6. **Botting** - Cooldown, notifications, auto-pause
7. **Backup** - Export, import, wipe

### Interaction Patterns
- Accordion sections (one open at a time to save space)
- Auto-save on change (no explicit save button)
- Visual confirmation (subtle toast or checkmark)
- Changes apply immediately

---

## Sources

### Modal UX
- [Mastering Modal UX: Best Practices & Real Product Examples - Eleken](https://www.eleken.co/blog-posts/modal-ux)
- [Modal UX Design for SaaS in 2025 - Userpilot](https://userpilot.com/blog/modal-ux-design/)
- [When, Where, and How to Use Modals in UX Design - Medium](https://medium.com/design-bootcamp/when-where-and-how-to-use-modals-in-ux-design-7f69841de9e5)
- [Modal design in UX: When to use them and when to skip them - LogRocket](https://blog.logrocket.com/ux-design/modal-ux-best-practices/)
- [Best Practices for Modal Window Design - UX Planet](https://uxplanet.org/best-practices-for-modal-window-design-627f7aba57f1)

### Drawer/Slide-out Patterns
- [Drawer UI Design: Best practices - Mobbin](https://mobbin.com/glossary/drawer)
- [Side Drawer UI: A Guide to Smarter Navigation - Design Monks](https://www.designmonks.co/blog/side-drawer-ui)
- [UI design pattern tips: slideouts, sidebars and drawers - Creative Bloq](https://www.creativebloq.com/ux/ui-design-pattern-tips-slideouts-sidebars-101413343)
- [PatternFly Drawer Design Guidelines](https://www.patternfly.org/components/drawer/design-guidelines/)
- [Side sheets - Material Design 3](https://m3.material.io/components/side-sheets/guidelines)

### Trading App UX
- [Financial App Design: UX Strategies - Netguru](https://www.netguru.com/blog/financial-app-design)
- [User Experience Design for Trading Apps - Medium](https://medium.com/@markpascal4343/user-experience-design-for-trading-apps-a-comprehensive-guide-b29445203c71)
- [TradingView - Platform for Trading & UI UX Design - Ron Design Lab](https://rondesignlab.com/cases/tradingview-platform-for-traders)
