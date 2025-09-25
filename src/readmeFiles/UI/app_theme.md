# Admin UI Theme Guide (One‑Page)
Minimalism is the key
This document distills the visual language and UX patterns from the Homepage and Department Homepages to help you keep a consistent brand feel across new pages.

## Brand DNA
- Dark glass surfaces with soft glow accents; high contrast foreground text.
- Department colors are bright neons on top of neutral dark:  
  Marketing: rgb(255, 220, 100) • Design: rgb(28, 251, 255) • Web: rgb(255, 58, 97) • Production: rgb(255, 255, 255) • Finance: rgb(11, 162, 101) • Master Admin: rgb(255, 100, 100)
- Typography: Jost for UI/headers; JetBrains Mono for numeric badges/IDs; light weights (200–300) for large headings, 500–700 for emphasis.
- Motion: subtle entrance (slide/fade up) and hover elevation; avoid aggressive transitions.

## Layout & Spacing
- Max content width: 1200px. Outer padding: 2rem desktop, 1rem tablet, 0.75rem mobile.
- Section spacing: 2–3rem between major blocks; components have 16–24px internal padding.
- Grid: responsive auto-fit minmax(280–350px, 1fr) for cards; stack to 1 column on mobile.

## Surfaces
- Background (page): linear-gradient(135deg, #0a0a0a–#1a1a1a–#0f0f0f) or (#1a1a1a–#2d2d2d–#1a1a1a).
- Card/Panel: glass effect
  - background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)
  - border: 1px solid rgba(255,255,255,0.1)
  - backdrop-filter: blur(10–20px)
  - border-radius: 16–20px
- Accent rails: 2px top gradient line using department color.

## Color System
- Text primary: #fff (90%); secondary: rgba(255,255,255,0.7); muted: rgba(255,255,255,0.5).
- Interactive tints come from the active context: use a department color when the page is department-scoped; otherwise use brand blue (e.g., #3b82f6) or green (#22c55e) for actions.
- Glow variables: derive rgba from the department color at 0.15–0.3 alpha for shadows/hover.

## Components
- Headings
  - H1 large, light weight with gradient or neon accent color; letter-spacing ~0.02em; line-height ~1.2.
  - Subhead as italic, lighter weight and 60–70% white.
- Cards (Dashboard options/links)
  - Use optionCard style: glass bg, subtle top gradient line, hover: translateY(-6–8px), shadow with department glow, border-color shifts to theme.
  - Internal content row: left numeric index in Mono, center text, right arrow; arrow translates +4px on hover.
- Action Buttons
  - Primary (contained): gradient using theme color → glow; dark text if bright background, else white.
  - Secondary (outlined): border-color = theme color or rgba(255,255,255,0.3); hover adds slight bg tint.
- Department Tiles (homepage)
  - Two actions: large "Dashboard" tile + compact "Goals" button.
  - CSS vars: --dept-color and --dept-glow control borders, shadows, and text.
- Inputs (MUI)
  - Keep dark mode: input text white, labels 70% white; focus border = theme color with soft glow.

## Motion
- Use slide/fade-up on section/card entry (0.6–0.8s ease-out). Stagger children by 0.1s increments.
- Hover states: translateY(-2 to -8px), glow shadow via rgba(theme, 0.2–0.4), and slight brightness increase.

## Imagery
- Thumbnails: object-fit: cover; rounded corners; 1px border rgba(255,255,255,0.1).
- When missing, show neutral placeholder with 30–40% white icon.

## Accessibility & Readability
- Maintain 4.5:1 contrast on text over glass panels.
- Target sizes: buttons >= 40px height; tap targets full-width on mobile.
- Reduced motion friendly: animations are decorative; avoid infinite/flashy loops in forms.

## Implementation Cheatsheet
- Container: max-width: 1200px; margin: 0 auto; padding responsive.
- Glass Card CSS (base):
  - background: linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  - border: 1px solid rgba(255,255,255,0.1);
  - backdrop-filter: blur(20px); border-radius: 16–20px.
- Top Rail: ::before with linear-gradient(90deg, transparent, var(--theme-color), transparent).
- Theme Vars per page:
  - --theme-color: department or feature color
  - --glow-color: rgba(theme, 0.15)
  - --border-color: rgba(theme, 0.3)
  - --hover-glow: rgba(theme, 0.25)

## Do & Don’t
- Do: reuse CSS variables for color; keep spacing consistent; prefer light typography with strong hierarchy.
- Don’t: mix random bright colors; overuse heavy shadows; place text directly on busy images without overlay.

Keep new pages minimal, glassy, and neon-accented. Reuse the DepartmentHomePage and DepartmentLinks visual patterns wherever possible for instant brand consistency.
