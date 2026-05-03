---
name: Nocturnal Pitch
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bccbb9'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#869585'
  outline-variant: '#3d4a3d'
  surface-tint: '#4ae176'
  primary: '#4be277'
  on-primary: '#003915'
  primary-container: '#22c55e'
  on-primary-container: '#004b1e'
  inverse-primary: '#006e2f'
  secondary: '#c6c6c7'
  on-secondary: '#2f3131'
  secondary-container: '#454747'
  on-secondary-container: '#b4b5b5'
  tertiary: '#c9c6c6'
  on-tertiary: '#313030'
  tertiary-container: '#adabab'
  on-tertiary-container: '#40403f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6bff8f'
  primary-fixed-dim: '#4ae176'
  on-primary-fixed: '#002109'
  on-primary-fixed-variant: '#005321'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c7'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#454747'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  headline-xl:
    fontFamily: Lexend
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.0'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Lexend
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Lexend
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: Lexend
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Lexend
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-bold:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: '1.0'
    letterSpacing: 0.05em
  label-mono:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.0'
    letterSpacing: 0.1em
spacing:
  unit: 4px
  stack-xs: 4px
  stack-sm: 12px
  stack-md: 24px
  stack-lg: 40px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 64px
---

## Brand & Style

This design system is built on the raw energy of midnight street soccer. It rejects the polished, safe aesthetics of corporate SaaS in favor of a **High-Contrast / Brutalist** hybrid. The brand personality is aggressive, social, and functional, mirroring the intensity of a match under floodlights.

The aesthetic utilizes heavy linework, stark monochromatic surfaces, and sharp accents of "Signal Green." Visual interest is generated through kinetic typography and structural rigidity rather than imagery or soft gradients. It feels like a physical poster pasted on a concrete wall—urgent, tactile, and unapologetically urban.

## Colors

The palette is strictly limited to maximize impact and ensure accessibility in low-light environments.

*   **Pitch Green (#22C55E):** Used exclusively for primary actions, success states, and critical "on-field" information.
*   **Absolute Dark (#0A0A0A):** The foundation. All background surfaces use this deep black to minimize eye strain and maximize the pop of the primary green.
*   **Concrete Overlay (#1A1A1A):** Used for structural elements like cards and section headers to create subtle separation without losing the dark aesthetic.
*   **Stark White (#FFFFFF):** Reserved for high-priority typography and icons. No grays are used for primary text; contrast is kept at the maximum.

## Typography

This design system utilizes **Lexend** for its athletic, wide-set proportions and exceptional readability. To achieve the "sports" look, headlines are set with heavy weights and tight tracking.

*   **Headlines:** Must always be uppercase. The `headline-xl` should be used for scores and team names, creating a "scoreboard" feel.
*   **Body:** Lexend provides a clear, geometric path for reading match details and social feeds.
*   **Technical Data:** **Space Grotesk** is used for labels, timestamps, and player stats (e.g., "15:00", "Gls: 3"). Its monospaced feel adds a layer of technical precision to the raw aesthetic.
*   **Logo Treatment:** While not captured in tokens, the logo should be implemented as a rough brush or "stencil" style vector to contrast against the clean UI typography.

## Layout & Spacing

The layout philosophy follows a **Fixed Grid** with a brutalist rhythm. Elements are organized into a strict 12-column grid for desktop and a 4-column grid for mobile.

*   **The Grid:** Use 0px gutters between cards that share a border, but 16px gutters for floating elements.
*   **Rhythm:** Spacing follows a 4px baseline. Large vertical gaps (`stack-lg`) should be used to separate match days, while tight spacing (`stack-xs`) is used for player lists and stats.
*   **Density:** Information density should be high. Minimize "whitespace" in the traditional sense; instead, use structural borders to define space.

## Elevation & Depth

This design system avoids shadows entirely. Depth is achieved through **Bold Borders** and color blocking.

*   **The "Pitch" Layer:** The base background is `#0A0A0A`.
*   **The "Structure" Layer:** Cards and containers use `#1A1A1A` with a 1px solid border of `#FFFFFF` (at 10% opacity) or `#22C55E` (for active/highlighted states).
*   **Interactive Depth:** When an element is pressed, it does not lift (no shadows); instead, it "activates" by switching its border or background color to the primary green. 
*   **Strokes:** Use 2px strokes for primary buttons and 1px strokes for secondary containers.

## Shapes

The shape language is **Sharp (0px)**. 

To maintain the urban, raw aesthetic, all buttons, cards, inputs, and avatars must have 90-degree corners. This evokes the geometry of a soccer pitch and the harsh architecture of the city. 

*   **Exceptions:** Circular shapes are permitted *only* for the soccer ball icon or specific status pips. All UI containers must remain rectangular.

## Components

*   **Buttons:** Rectangular with high-contrast fills. Primary buttons are Pitch Green with black text. Secondary buttons are outline-only (2px white stroke) with white text.
*   **Match Cards:** Deep black backgrounds with a left-edge accent border in Pitch Green to indicate "Live" or "Upcoming" status. Headlines within cards are always uppercase.
*   **Chips/Tags:** Used for "Position" (e.g., DEF, MID) or "Status." These are small, sharp-edged blocks with `label-mono` typography.
*   **Input Fields:** Bottom-border only or full-stroke rectangles. No soft glows on focus; instead, the border weight increases from 1px to 2px in Pitch Green.
*   **Lists:** Match fixtures or player rosters should be separated by 1px horizontal dividers. Use the `label-mono` style for secondary data points like "Goals" or "Yellow Cards."
*   **The "Scoreboard":** A specialized component for match results using `headline-xl` centered, creating a massive visual anchor for the user.