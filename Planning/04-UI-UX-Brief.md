# Document 04 — UI/UX Design Brief: Visual & Interaction Design Guide

---

## Aesthetic

Clean, modern, accessible. Dark-mode first with light-mode support. Professional but friendly — suited for local Indian small business owners. Inspired by modern SaaS dashboards with a warm, approachable feel.

## Color Palette

| Role                    | Color (Dark Mode) | Hex                                     |
| ----------------------- | ----------------- | --------------------------------------- |
| **Primary / Brand**     | Gradient brand    | `#6C47FF` → `#A855F7` (purple gradient) |
| **Background**          | Dark charcoal     | `#0A0A0B` / `#09090B`                   |
| **Card / Surface**      | Dark surface      | `#18181B`                               |
| **Border**              | Subtle border     | `#27272A`                               |
| **Text**                | Light             | `#FAFAFA`                               |
| **Muted Text**          | Muted gray        | `#A1A1AA`                               |
| **Accent / Success**    | Green             | `#22C55E`                               |
| **Warning**             | Amber             | `#F59E0B`                               |
| **Error / Destructive** | Red               | `#EF4444`                               |

## Typography

- **UI Font:** Inter (system sans-serif) — all headings and body text
- **Code/Mono:** JetBrains Mono or monospace (code blocks only)
- **Scale:** 12px / 14px / 16px / 18px / 24px / 30px
- **Headings:** Bold (font-weight 700), tight leading
- **Body:** Regular (font-weight 400), comfortable leading

## Component Style

- **Border Radius:** `rounded-xl` (12px) for cards, `rounded-lg` (8px) for buttons/inputs
- **Shadows:** Subtle `shadow-sm` or `shadow-surface` — no heavy drop shadows
- **Buttons:** Solid gradient for primary, outlined for secondary
- **Cards:** Border-based with transparent background — no filled card backgrounds
- **Inputs:** Border-only style with focus ring
- **Icons:** Lucide icons, 16-24px depending on context

## Dark Mode / Light Mode

- **Primary:** Dark mode — this is the default and most polished experience
- **Light mode:** Supported via `ThemeProvider` + `ThemeToggle` — uses same color structure inverted
- **Toggle:** Available in navbar for both modes

## Reference Apps

- Linear (clean dark dashboard, minimal UI)
- Vercel (border cards, typography hierarchy)
- Notion (inline editing, clean surfaces)

## Key UI Patterns

- **Dashboard:** Tab-based navigation (Products / Tools / Profile)
- **Tools:** Grid of tool cards with icons (Orders, Upload, Inventory, WhatsApp Agent)
- **Storefront:** Product grid with cards, stock badges, order modal
- **Analytics:** Stat cards (revenue, orders, products) at top
- **Modals:** Centered, overlay-background, close on Escape/outside click

## Mobile Responsiveness

- **Breakpoints:** sm (640px), md (768px), lg (1024px)
- **Mobile nav:** Bottom tab bar (Products, Tools, Profile)
- **Desktop nav:** Top header with tab buttons
- **Storefront:** Single column on mobile, 2-3 columns on desktop
- **Dashboard:** Full-width on mobile, max-w-6xl centered on desktop

## Accessibility

- Sufficient color contrast (WCAG AA minimum)
- Focus rings on all interactive elements
- Labels on all form inputs
- Role-based content visibility (not just visual hiding)
- Loading skeletons during data fetch
- Toast notifications for all actions
