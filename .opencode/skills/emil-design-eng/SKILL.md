---
name: emil-design-eng
description: Design Engineering skill inspired by Emil Kowalski's philosophy (vaul, sonner, cmdk). Obsessive attention to UI polish, micro-interactions, every UI state, accessibility, and performance. Use when building UI components, refining interfaces, adding animations, or reviewing frontend quality.
version: 1.0.0
user-invocable: true
argument-hint: "[review|polish|animate|audit|build] [target]"
---

# Design Engineering — Emil Kowalski Philosophy

Design engineering is the practice of building interfaces where every pixel, every state, every transition, and every edge case has been considered and crafted. It's not about flashy visuals — it's about the invisible details that make software feel solid, responsive, and human.

## Core Principles

1. **"It works" is the minimum, not the goal.** The bar is not "functional" — the bar is "delightful to use."
2. **Every state matters.** Loading, empty, error, success, edge cases — if you didn't design it, you didn't build it.
3. **Micro-interactions are not decoration.** A 200ms transition signals cause and effect. A well-timed stagger communicates hierarchy. Motion is meaning.
4. **Accessibility is engineering, not a checklist.** If it's not accessible, it's not done.
5. **Performance is UX.** A 500ms delay feels slower than a 300ms delay with an optimistic UI.
6. **Details compound.** One imperfect padding, one misaligned icon, one unhandled edge case — each is fine alone. Together they erode trust.

## Rules

### 1. UI Polish — Padding & Margin

- Padding and margins must be intentional and consistent.
- Ensure sufficient breathing room and clear visual hierarchy.
- Use consistent spacing patterns — prefer multiples of 4px (or the design system's base unit).
- Check for unbalanced spacing: `padding-left ≠ padding-right` in a centered container is a bug.
- Pay attention to nested spacing: a card inside a section may need different padding than the section itself.
- Elements hugging the edges of their container (especially on mobile) feel cramped and unprofessional.
- Text inside buttons, inputs, and cards needs generous inner padding — crowded text looks cheap.
- Consider collapsed margins in CSS — two adjacent elements with `margin-bottom` and `margin-top` collapse, which may not match what you see in the design tool.

### 2. Visual Hierarchy

- The most important action on the page must be visually obvious within 200ms.
- Use size, weight, and color — never rely on position alone to indicate importance.
- Secondary actions should be visually subdued: outline, ghost, or text-only buttons.
- Avoid competing visual weights. If everything is bold, nothing is bold.
- Use whitespace to group related content and separate unrelated content.
- Headings should clearly segment content. If a section has no clear heading, reconsider the layout.
- Contrast is hierarchy. Low-contrast text should only be used for truly secondary information.
- Supporting text must be distinguishable from main text but still readable (meet WCAG AA at minimum).
- Lists of identical items (cards, list rows) need a visual anchor — an icon, an avatar, a number — to help the eye scan.

### 3. Interaction Design

- Every interactive element must have hover, focus, active, and (where applicable) disabled states.
- Cursor must change appropriately: `pointer` for clickable, `default` for non-interactive, `not-allowed` for disabled.
- Disabled states are not just gray — they must communicate *why* something is disabled (tooltip, explanation text).
- Click targets must be large enough: minimum 44×44px for touch targets (WCAG 2.5.8).
- Focus indicators must be visible and not rely solely on `outline: none`. Use custom focus rings if removing the default.
- Tap/click feedback is essential: a button press needs a visual response within 50ms.
- Transitions between states must be smooth and purposeful — no jarring instant swaps.
- Consider the full interaction flow: what happens before, during, and after the action.
- Undo is a design pattern, not just a feature. Any destructive action should be recoverable.

### 4. Accessibility (Non-Negotiable)

This is not a checklist. These are minimum requirements.

- All interactive elements must be keyboard accessible.
- All form inputs must have associated `<label>` elements (not just `aria-label`).
- Use semantic HTML: `<button>` for actions, `<a>` for navigation, `<nav>` for nav regions, `<main>` for primary content.
- ARIA attributes are for fixing broken semantics, not for papering over them. Fix the HTML first.
- Color is never the sole indicator of state. Use icons, text, patterns, or underlines alongside color.
- Focus order (`tabindex` / DOM order) must match visual order.
- Skip links are required for pages with navigation.
- Announce state changes to assistive technology: `aria-live` regions for dynamic content, `aria-busy` for loading.
- Test with a screen reader. If you haven't, you don't know if it works.
- Respect `prefers-reduced-motion`: replace all animations with crossfades or instant transitions.
- Respect `prefers-color-scheme`: dark mode is not optional for production apps.
- Respect `prefers-contrast: more`: ensure sufficient contrast for high-contrast mode users.

### 5. Performance as UX

- Time to interactive (TTI) is a design concern. If the page loads but interactions are sluggish, the design fails.
- Optimistic UI: update the UI immediately on user action, then reconcile with the server. Users perceive speed as quality.
- Skeleton screens are better than spinners — they communicate structure and progress.
- Animations must not block the main thread. Use `transform` and `opacity` (composited properties) for smooth 60fps animations.
- Lazy-load below-the-fold content, but ensure the layout doesn't jump when content loads.
- Image loading: use `loading="lazy"`, proper dimensions to prevent layout shift, and responsive images (`srcset`).
- Font loading: use `font-display: swap` or `font-display: optional` to prevent invisible text (FOUT/FOIT).
- Bundle size awareness: every dependency has a cost. Consider tree-shaking and dynamic imports.
- Debounce search inputs, resize handlers, and scroll listeners. Throttle animation frames with `requestAnimationFrame`.
- Use passive event listeners for scroll and touch events.

### 6. Responsive Design

- Mobile-first CSS: base styles are the mobile layout, media queries add complexity for larger screens.
- Touch targets must be ≥44×44px on mobile (WCAG 2.5.8).
- Horizontal scrolling is almost always a bug. Use `overflow-x: hidden` on the body and check all containers.
- Text must reflow at all viewport widths. No fixed-width containers that cause horizontal scroll.
- Tables on mobile: either make them horizontally scrollable within a card, or restructure as a list.
- Navigation must work as a touch target on mobile. Hamburger menus are a fallback, not a default.
- Modals and drawers must account for the mobile viewport: the address bar appearing/disappearing changes `100vh`.
- Use `100dvh` (dynamic viewport height) instead of `100vh` for full-screen elements on mobile.
- Test on actual mobile devices. Emulators miss real-world feel (touch delay, scroll physics, keyboard appearance).
- Breakpoints should be content-driven, not device-driven. Add a breakpoint when the layout breaks, not at a specific device width.

### 7. Micro-interactions

Micro-interactions are the 100-300ms moments that communicate feedback, status, and hierarchy. They are not decoration — they are communication.

- Button press: scale down to 0.97 with a quick 100ms ease, release back with 200ms ease-out. This communicates "something happened."
- Hover: 150ms transition on background-color, border, or transform. Instant feels jarring.
- Focus ring: 200ms transition on opacity or box-shadow. Don't make focus rings snap on/off.
- Page transitions: 200-300ms fade+slide. Longer than 300ms feels slow.
- List item stagger: 50-80ms delay between each item, max 500ms total. Communicates hierarchy and order.
- Skeleton to content: 300ms crossfade. Skeleton disappearing instantly looks like a glitch.
- Error shake: a 400ms horizontal shake on form inputs communicates "try again" without words.
- Notification enter: slide in (200ms), stay (3-5s), slide out (200ms). The timing communicates urgency.
- Tab switch: 150ms crossfade. Active tab underline slides with a 200ms ease.
- Modal open: overlay fades in (200ms), modal scales up slightly (250ms, ease-out). Gives context and focus.

**Motion token reference:**

| Token | Duration | Easing | Use |
|-------|----------|--------|-----|
| `--ease-in-out` | 200ms | `cubic-bezier(0.65, 0, 0.35, 1)` | Hover, focus, basic transitions |
| `--ease-out` | 200-300ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Elements entering, buttons releasing |
| `--ease-in` | 150ms | `cubic-bezier(0.65, 0, 0.35, 1)` | Elements leaving, modals closing |
| `--spring` | 400-600ms | Spring physics (stiffness: 300, damping: 25) | Emphasis, celebration, attention |
| `--stagger-fast` | 50ms | — | Delay between items in a rapid list |
| `--stagger-slow` | 80ms | — | Delay between items in a prioritized list |

### 8. Animation Principles

- Prefer `transform` and `opacity` for animations. They are GPU-composited and don't trigger layout/paint.
- Never animate `width`, `height`, `top`, `left`, `margin`, `padding`, or `border` (triggers layout).
- Animating `box-shadow` and `filter` triggers paint — use with care.
- Entrance animations: elements should enter from a logical direction. A sidebar enters from the left. A notification enters from the top-right. A modal enters from center.
- Exit animations are as important as entrance animations. Don't let elements vanish — animate them out.
- Stagger animations visually communicate that items are part of a set. Without stagger, a list animating in looks like one blob.
- Duration depends on distance: a full-page transition needs 300ms; a micro-interaction (hover, focus) needs 100-150ms.
- Easing communicates material feel: ease-out feels natural (things slow down), ease-in feels abrupt (things crash to a stop), linear feels mechanical.
- CSS `@keyframes` for simple animations, Web Animations API or Framer Motion for complex orchestrated sequences.
- Respect `prefers-reduced-motion`: `@media (prefers-reduced-motion: reduce)` should reduce all animations to a single 150ms crossfade or instant transition.

### 9. Color and Contrast

- Body text must achieve WCAG AA (4.5:1) against its background. Large text (≥18px or ≥14px bold) needs 3:1.
- Placeholder text also needs 4.5:1, not the default muted gray. Most UIs fail here.
- Use relative luminance (not perceived brightness) to compute contrast ratios.
- Gray text on a colored background looks washed out. Use a darker shade of the background's hue instead.
- Color palettes should have clear semantic roles: `--primary`, `--secondary`, `--accent`, `--danger`, `--success`, `--warning`, `--info`, `--muted`, `--border`, `--surface`, `--background`, `--foreground`.
- Avoid relying on hue alone to convey meaning. Color + icon + text label = accessible.
- Dark mode: don't just invert colors. Re-map the entire palette: dark surfaces, lighter text, adjusted saturation.
- Test all color combinations with a contrast checker. If you haven't verified the contrast ratio, you're guessing.
- Use OKLCH for perceptually uniform color spaces. It produces more consistent lightness across hues than HSL or RGB.

### 10. Typography

- Body line length must be capped at 65-75 characters per line (`max-width: 65ch`).
- Font size scale should be systematic, not arbitrary. Use a modular scale (e.g., 1.25 ratio).
- Line height: 1.5 for body text, 1.1-1.2 for headings. Tighter for larger text, looser for smaller text.
- Don't pair similar fonts (two geometric sans-serifs). Pair on contrast: serif + sans, or use one family with variable weights.
- `text-wrap: balance` on headings (`<h1>-<h3>`) prevents orphaned words.
- `text-wrap: pretty` on paragraphs reduces widows (single words on the last line).
- Responsive type: use `clamp()` for fluid typography: `font-size: clamp(1rem, 2.5vw, 1.5rem)`.
- Letter-spacing in headings: not tighter than `-0.04em` (letters touch below that).
- All-caps text needs increased letter-spacing (`0.05em` to `0.1em`).
- System font stack is acceptable for utility UI. Custom fonts are for brand surfaces.
- If using `@font-face`, always include `font-display: swap` or `font-display: optional`.

### 11. Layout

- Flexbox for 1D layouts (row or column), Grid for 2D layouts (rows AND columns).
- Don't default to Grid when `flex-wrap` would be simpler.
- Cards are the lazy default. Use them only when they're the best affordance for the content.
- Nested cards are always wrong. Don't put a card inside a card.
- Semantic z-index scale: no arbitrary `z-index: 9999`. Define `--z-dropdown (100)`, `--z-sticky (200)`, `--z-modal-backdrop (300)`, `--z-modal (400)`, `--z-toast (500)`, `--z-tooltip (600)`.
- Consistent gutter/spacing system: use a spacing scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128).
- Avoid magic numbers in layouts. Every value should reference a design token.
- Section spacing (margin between major sections) should be generous — 80-160px on desktop, 48-80px on mobile.
- Use `min-height: 100dvh` (not `100vh`) for full-viewport sections to account for mobile browser chrome.
- Position sticky needs explicit `top` or `bottom` and a defined `z-index` to work predictably.

### 12. Forms and Inputs

- Every input needs a visible, persistent label. Placeholder text is NOT a label.
- Input height: minimum 44px for touch targets. Slightly taller inputs feel more premium.
- Focus state: clear, visible focus indicator. A 2px solid ring with 2px offset is the standard.
- Error state: input border turns red, error message appears BELOW the input (not inside, not as a tooltip).
- Error messages must be specific: "Email is required" not "Required field."
- Success state: brief green border + check icon for inline validation, or a success message after submission.
- Validation timing: validate on blur (not on every keystroke for complex fields, but do show password strength inline).
- Disabled inputs: use `cursor: not-allowed`, reduce opacity to 50%, and show a tooltip explaining why it's disabled.
- Password inputs: include a show/hide toggle and a "forgot password" link nearby.
- Autofill: style `input:-webkit-autofill` to match the design system. Yellow autofill background breaks dark mode.
- Select menus: consider custom select with search for options > 5 items. Native `<select>` is fine for 2-5 options.
- Group related fields with `<fieldset>` and `<legend>` for accessibility.
- Long forms should be paginated or use an accordion, not a single endless scroll.
- Submit buttons should show loading state (spinner + "Saving..."), disable during submission, and prevent double-clicks.

### 13. Error States

- Errors must be visible, specific, and actionable. "Something went wrong" is never acceptable alone.
- Inline errors: appear next to the relevant field, not in a banner at the top.
- Toast/notification errors: for system errors (network failure, server error), not for form validation.
- Error pages (404, 500): should be on-brand, include a clear message, and offer a path forward (home button, search).
- Network errors: detect offline status with `navigator.onLine` and show a persistent banner. Reconnect automatically.
- API errors: show a human-readable message, not the raw error object. Log the technical detail for debugging.
- Rate limiting errors: tell the user when they can try again ("Too many requests. Try again in 30 seconds.").
- Permission errors: explain what resource they need access to and how to request it (if applicable).
- Timeout errors: offer retry with exponential backoff. Don't let the user hammer a failing endpoint.
- Every error state should be tested. If you haven't seen it, it doesn't work.

### 14. Loading States

- Skeleton screens over spinners. Skeletons communicate structure and set expectations for content layout.
- Spinners are acceptable for non-content areas (button loading, background refresh).
- Skeleton animation: a subtle shimmer pulse (2s infinite) that moves left to right. Avoid high-frequency pulsing (triggers vestibular disorders).
- Skeleton timing: show skeleton immediately (no delay), then crossfade to content (300ms) when ready.
- For page transitions, consider a shared element transition or a slide transition over a blank white flash.
- Buttons in loading state: show a spinner icon + "Saving..." text, disable the button, and prevent re-submission.
- Optimistic UI: show the expected result immediately, reconcile in the background. If it fails, revert and show an error.
- Loading more items (infinite scroll): show a subtle loading indicator at the bottom, not a full-page spinner.
- Deliberate loading: if an action genuinely takes >1s, show a progress indicator (not just a spinner).
- Avoid `Math.random()` or `setTimeout` for simulating loading. Real loading has real timing characteristics.

### 15. Empty States

- Every list, table, and data view must have a designed empty state. "No data" text alone is not acceptable.
- Empty states should include:
  - An illustration or icon (illustrative, not decorative — helps the user understand what goes here)
  - A clear heading: "No players yet" not "No data"
  - A description: "Add your first teammate to get started"
  - A call to action: "Add player" button if the user can populate it
- Empty states should not be mistakes. They are a natural part of the app lifecycle, especially during onboarding.
- A search returning no results should suggest alternatives: "No results for 'X'. Try different keywords or filters."
- Error + empty is different from "naturally empty." Don't show an empty state for a failed fetch.

### 16. Modals and Drawers

- Modals should have a clear purpose: confirmation, form, or detail view. Don't use modals for navigation.
- Modal overlay: semi-transparent background (60-70% opacity), clicking it closes the modal.
- Modal focus trap: Tab key cycles through modal elements only. Pressing Escape closes the modal.
- Modal should not close on accidental overlay click for destructive actions. Require explicit "Cancel" or "Confirm."
- Drawers slide in from the edge (left for navigation, right for detail/panel).
- Drawer backdrop: same as modal — clicking outside closes the drawer.
- Both modals and drawers must have a close button (X) in the header.
- Body scroll must be locked when a modal/drawer is open. Use `overflow: hidden` on `<body>` and account for scrollbar width to prevent layout shift.
- Multiple modals stacked is bad UX. One modal at a time.
- Modal entrance: overlay fade (200ms) + modal scale/translate (250ms, ease-out). Exit: reverse (150ms).

### 17. Navigation

- Current/active page must be visually indicated in the navigation. Not just color — use weight, underline, or a combination.
- Breadcrumbs for any app with depth > 2 levels. Last breadcrumb is the current page (not a link).
- Sticky nav: only if the user benefits from always-accessible navigation. On content-heavy pages, hide nav on scroll down, show on scroll up.
- Mobile nav: hamburger menu is the fallback. Consider bottom tab bars for mobile apps, or a slide-in drawer.
- Back buttons: always go to the previous logical page, not the browser history back (unless that's the same).
- Skip link: first focusable element on the page, visible on focus, jumps to main content.
- Navigation items should be `<a>` elements (semantic, works with keyboard, works with screen readers).
- Keyboard navigation in nav bars: use `tabindex="0"` for items, arrow keys to move between items.

### 18. Design System Consistency

- All spacing, color, typography, and motion values should reference design tokens. No magic numbers.
- Components should be consistent within themselves (a `<Button>` looks and behaves the same everywhere).
- Variation in components is intentional (variant prop), not accidental (styling a `<button>` directly inline).
- Reuse existing components before creating new ones. If no existing component fits, reconsider the design before building new.
- Documentation: every component should have documented props, states, and usage examples. At minimum in code comments or JSDoc/TSDoc.
- Theme-aware: all colors and spacing must work in light and dark mode. Test both. Ship both.
- Avoid duplication. If the same pattern appears twice, extract it into a component or utility.

### 19. Testing UI States

- Every component must be viewable and testable in loading, empty, error, and success states.
- For stateful components, use Storybook stories (or similar) to visualise all states.
- Test with realistic data: lorem ipsum tells you nothing about layout. Use real data shapes and lengths.
- Test with long text: what happens when a username is 30 characters? When a title wraps to 3 lines?
- Test with missing data: what if the avatar URL is broken? What if the description is empty?
- Test with screen readers: if you haven't heard it, you don't know if it works.
- Test with keyboard-only navigation: if you can't tab through it, it's broken.
- Test at 200% zoom: WCAG requires content to not be lost at 200% zoom.
- Test with dark mode AND high contrast mode. They are different settings and must both work.
- Test on a slow network (3G throttling). If the loading state looks broken, fix it.

### 20. The Details That Matter

- Border-radius: consistent across the app. Define `--radius-sm (4px)`, `--radius-md (8px)`, `--radius-lg (12px)`, `--radius-xl (16px)`, `--radius-full (9999px)`.
- Shadows: layered. A card should have a subtle shadow that communicates elevation. Define `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`.
- Icons inside buttons: same color as text, 16-20px, centered. Icon-only buttons need a tooltip or aria-label.
- Dividers: `1px solid` in a muted border color. Don't use 2px dividers — they look heavy.
- Lists: consistent spacing between items. Each list item should be the same height (or have consistent padding).
- Scrollbar styling: customize for the design (`::-webkit-scrollbar`). The default OS scrollbar breaks most design systems.
- Selection color: `::selection` should be styled to match the brand color. The default blue selection breaks dark mode.
- Focus rings: use `outline: 2px solid` with `outline-offset: 2px`. Use the brand color (or white on dark bg).
- Placeholder text: use a muted foreground color, not a different family/size/weight. It should blend, not look disabled.

## Review Checklist

When doing a design review, check every item:

- [ ] All interactive elements have hover, focus, active, and disabled states
- [ ] Touch targets are ≥44×44px
- [ ] Focus indicators are visible (not just `outline: none`)
- [ ] Color contrast meets WCAG AA (4.5:1 body, 3:1 large text)
- [ ] Keyboard navigation works (Tab, Enter, Escape, arrow keys)
- [ ] Screen reader: all content is announced, all actions are labeled
- [ ] Loading, empty, error, and success states exist for every data view
- [ ] Animations respect `prefers-reduced-motion`
- [ ] Dark mode works (colors are re-mapped, not inverted)
- [ ] Responsive: works at 320px, 768px, 1024px, 1440px
- [ ] 200% zoom: no content lost, no horizontal scroll
- [ ] No magic numbers — all values reference design tokens
- [ ] Optimistic UI for frequent actions
- [ ] Spacing is consistent (multiples of base unit)
- [ ] Modals/drawers: focus trap, Escape to close, body scroll locked
- [ ] Forms: labels exist, validation works, errors are specific
- [ ] Empty states are designed (icon, heading, description, CTA)
- [ ] Performance: no layout-triggering animations, lazy loading where appropriate
- [ ] No nested cards
- [ ] Semantic HTML: `<button>`, `<a>`, `<nav>`, `<main>`, `<header>`, `<footer>`
- [ ] Color is never the sole indicator of state (adds icon/text)
