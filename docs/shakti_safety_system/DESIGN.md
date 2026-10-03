---
name: Shakti Safety System
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#5a4044'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0ef'
  outline: '#8e6f74'
  outline-variant: '#e3bdc3'
  surface-tint: '#bc004f'
  primary: '#b0004a'
  on-primary: '#ffffff'
  primary-container: '#d81b60'
  on-primary-container: '#fff2f3'
  inverse-primary: '#ffb2bf'
  secondary: '#b51a1b'
  on-secondary: '#ffffff'
  secondary-container: '#d93630'
  on-secondary-container: '#fffbff'
  tertiary: '#12661e'
  on-tertiary: '#ffffff'
  tertiary-container: '#318035'
  on-tertiary-container: '#dfffd6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9de'
  primary-fixed-dim: '#ffb2bf'
  on-primary-fixed: '#3f0016'
  on-primary-fixed-variant: '#90003b'
  secondary-fixed: '#ffdad6'
  secondary-fixed-dim: '#ffb4ab'
  on-secondary-fixed: '#410002'
  on-secondary-fixed-variant: '#93000b'
  tertiary-fixed: '#a3f69c'
  tertiary-fixed-dim: '#88d982'
  on-tertiary-fixed: '#002204'
  on-tertiary-fixed-variant: '#005312'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e5e2e1'
typography:
  display-sos:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '700'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered for personal safety, immediate clarity, and psychological reassurance. Tailored specifically for modern Android environments, the visual philosophy marries warmth with extreme functional efficiency. The user experience balances two critical psychological modes:

1. **Daily Peace of Mind (Passive State):** Welcoming, reassuring, and dignified. Soft, warm blush tones eliminate cold clinical tech aesthetics, fostering daily engagement with journey tracking, trusted circle check-ins, and safety zone configurations without inducing paranoia.
2. **High-Stress Crisis Management (Active State):** High-contrast, zero-cognitive-load, and instant. Emergency triggers demand immediate visual identification under distress, motion, or compromised visibility.

The design movement is **Clean Modern Tactile Minimalism**: structural flat surfaces, crisp 1-pixel architectural borders, generous touch affordances, and pure chromatic restraint. Glowing gradients, neon highlights, and complex glass effects are strictly excluded to preserve battery performance, maintain visual calm, and guarantee sub-second comprehension.

## Colors

The palette is strictly governed by semantic priority to maintain zero ambiguity during crises. Cold hues (blues, purples, cyans) and synthetic neon gradients are forbidden across all surfaces.

### Surfaces & Canvases
- **Canvas Base:** `#FFFFFF` (pure white for main screens and lists).
- **Canvas Secondary / Background Fill:** `#FFF5F7` and `#FDF2F4` (gentle warm blush to soften structural full-screen views).
- **Surface Elevation 1 (Cards):** `#FFFFFF` with 1px border `#FCE4EC`.
- **Surface Elevation 2 (Highlighted Cards / Alert Trays):** `#FFF0F3` with 1px border `#F8BBD0`.

### Functional Accents
- **Primary Rose (`#D81B60` / `#E91E63`):** Reserved for primary interactive elements, active navigation states, selected chips, and primary non-emergency CTA buttons.
- **Emergency Crimson (`#B71C1C` / `#C2185B`):** Strictly isolated to SOS activation controls, silent distress toggles, alert broadcast banners, and rapid direct 112 dispatch interactions. Never used for decorative accents.
- **System Active Green (`#2E7D32`):** Micro-indicator exclusively applied to the 8px live GPS tracking status and active encrypted telemetry broadcast nodes.

### Typography & Content Neutrals
- **Text Primary:** `#212121` (deep charcoal ensuring WCAG AAA legibility against white and blush surfaces).
- **Text Secondary:** `#616161` (slate neutral for supportive metadata, subheadings, and field labels).
- **Text Placeholder & Subtle:** `#9E9E9E` (unobtrusive grey strictly for input hints and disabled icons).

## Typography

Typography relies on **Plus Jakarta Sans** for its combination of geometric precision and humanist warmth. It delivers immediate legibility even on lower-tier Android displays under direct sunlight.

- **Weight Discipline:** Restrict styling to `400` (Regular), `500` (Medium), `600` (Semi-Bold), `700` (Bold), and `800` (Extra-Bold for the SOS trigger). Avoid ultra-thin or hairline weights that fail accessibility under stress.
- **Letter Spacing:** Maintain natural optical tracking across titles and standard body copy. For `label-sm` and uppercase status pills, apply `+0.02em` tracking to prevent glyph crowding at reduced sizes.
- **Emergency Priority:** The `display-sos` level is reserved exclusively for the SOS central trigger countdown and critical confirmation headlines.

## Layout & Spacing

Layout geometry follows an uncompromising 8-point base grid (using 4pt micro-steps for hairline icon positioning and micro-badges).

### Layout Rules
- **Canvas Margins:** Screen gutters are fixed at `1.25rem` (20px) on standard Android viewports, expanding to `1.5rem` (24px) on large screens/foldables.
- **Touch Affirmation:** Standard interactive elements enforce an Android-standard minimum boundary of `48px × 48px`. Key touchpoints (such as quick dials, fake-call triggers, and check-in confirmation buttons) require a minimum height of `56px`. The primary emergency trigger mandates a minimum diameter of `88px` (or `120px` in focused SOS dashboard layouts).
- **Component Breathing Space:** Cards use internal padding of `1rem` (16px) or `1.25rem` (20px), separating internal icon-text pairings with `0.75rem` (12px) to prevent mis-taps.

## Elevation & Depth

Visual hierarchy is maintained through flat, architectural layering and delicate, warm boundary strokes rather than murky ambient drop shadows.

- **Flat Layering via Borders:** Surfaces communicate separation using a crisp `1px` solid border (`#FCE4EC` on white surfaces, `#F8BBD0` on tinted blush surfaces).
- **Tonal Elevation:** Floating panels, top app bars, and bottom sheets adopt pure `#FFFFFF` resting against `#FFF5F7` background planes.
- **Shadow Elimination:** No blurred dropshadows or heavy black multi-layered ambient occlusions are used. If an Android system elevation is mandatory for persistent bottom sheets or snackbars, use a single, extra-diffused tint: `box-shadow: 0px 4px 20px rgba(216, 27, 96, 0.06);`.
- **Active State Depth:** Tapping or holding active buttons shifts the background color shade down by 6% without skewing the physical card geometry.

## Shapes

The shape vocabulary uses rounded, protective geometries that project human warmth without sacrificing structural order.

- **Standard Cards & Modals:** Radii are standardized at `1rem` (16px) to `1.25rem` (20px), creating soft, organic containers that are easy to scan.
- **Action Buttons & Inputs:** Enforce `1rem` (16px) or full pill caps (`9999px`) for quick-action pills and status chips.
- **Avatars & Critical Node Targets:** Complete circles (`50%` / circular), creating focal contrast against rectangular informational cards.
- **Emergency Button:** A calibrated double-ringed circle that provides an unmistakable, thumb-friendly target.

## Components

### Buttons
- **Primary Action (Non-Emergency):** 
  - Height: `56px`. Background: `#D81B60`. Text: `#FFFFFF` (SemiBold). Border-radius: `16px`. Active press: `#C2185B`.
- **Secondary / Outline Action:** 
  - Height: `56px`. Background: `#FFFFFF`. Border: `1px solid #F8BBD0`. Text: `#D81B60` (SemiBold).
- **Emergency SOS Trigger:** 
  - Circular (`88px` to `120px`). Background: `#B71C1C`. Icon/Label: `#FFFFFF`. Perimeter ring: `4px solid #FFF0F3`. Long-press progress feedback ring: `#B71C1C`.
- **Emergency Quick-Dial (112 / Police / Ambulance):**
  - Height: `56px`. Background: `#B71C1C`. Text: `#FFFFFF` with emergency siren/phone vector icon.

### Chips & Filters
- **Default State:** Background `#FFFFFF`, border `1px solid #FCE4EC`, text `#616161`, height `36px`, rounded `9999px`.
- **Selected State:** Background `#FFF0F3`, border `1px solid #D81B60`, text `#D81B60` (Bold).

### Cards
- **Informational Card:** Background `#FFFFFF`, border `1px solid #FCE4EC`, padding `16px`, corner radius `16px`.
- **Alert / Highlighted Card:** Background `#FFF0F3`, border `1px solid #F8BBD0`, padding `16px`, corner radius `16px`.

### Lists & Row Items
- **Contact / Circle List Item:**
  - Height: `72px`. Clean white card container.
  - Left element: Pink circle avatar (`44px × 44px`, background `#FFF0F3`, text `#D81B60`, bold initials).
  - Center: Contact Name (`16px`, `#212121`, Bold) over Phone/Relationship label (`14px`, `#616161`).
  - Right: Quick Call action icon inside a `40px` circular `#FFF5F7` target.

### Form Inputs & Text Fields
- Height: `56px`. Surface: `#FFFFFF`. Border: `1px solid #FCE4EC`. Text: `#212121` (`16px`). Placeholder: `#9E9E9E`.
- Focused state: Border `1.5px solid #D81B60` with zero diffuse glow.

### Checkboxes & Radios
- Size: `24px × 24px`. Inactive: Border `2px solid #F8BBD0`, fill `#FFFFFF`.
- Checked: Fill `#D81B60`, checkmark `#FFFFFF`.

### Live Telemetry / GPS Status Dot
- Diameter: `8px × 8px`. Fill: `#2E7D32` (Subtle Muted Green). Accompanied by text: "Live Location Sharing Active" in `#616161` (`12px`, Medium).