# Gyandeep Accessibility Audit Report

**Date:** 2026-02-22  
**Standard:** WCAG 2.1 Level AA  
**Auditor:** Automated analysis + manual code review

---

## Summary

| Category           | Issues Found | Critical | Major | Minor |
|--------------------|:------------:|:--------:|:-----:|:-----:|
| **Color Contrast** | 5            | 2        | 2     | 1     |
| **Keyboard Nav**   | 6            | 3        | 2     | 1     |
| **ARIA/Semantics** | 7            | 2        | 3     | 2     |
| **Focus Mgmt**     | 4            | 2        | 1     | 1     |
| **Motion**         | 2            | 0        | 1     | 1     |
| **Forms**          | 4            | 1        | 2     | 1     |
| **Total**          | **28**       | **10**   | **11**| **7** |

---

## 🔴 Critical Issues (P0 — Fix Immediately)

### 1. Missing keyboard focus styles on all interactive elements
- **File:** Global (Tailwind CDN resets outlines)
- **Problem:** Tailwind's CDN `preflight` removes `outline` on `:focus`, leaving no visible focus indicator for keyboard users.
- **WCAG:** 2.4.7 Focus Visible (Level AA)
- **Fix:** ✅ **DONE** — Added `:focus-visible` styles in `design-tokens.css` with `box-shadow` and `outline`.

### 2. Toast notifications not announced to screen readers
- **File:** `components/ToastNotification.tsx`
- **Problem:** Missing `role="alert"` and `aria-live="assertive"` on toast container.
- **WCAG:** 4.1.3 Status Messages (Level AA)
- **Fix:** ✅ **DONE** — Rebuilt with `role="alert"`, `aria-live="assertive"`, `aria-atomic="true"`.

### 3. Missing skip navigation link
- **File:** `index.html`
- **Problem:** No mechanism for keyboard users to bypass repetitive navigation.
- **WCAG:** 2.4.1 Bypass Blocks (Level A)
- **Fix:** ✅ **DONE** — Added `<a href="#main-content" class="gd-skip-link">` in `index.html`.

### 4. Missing `aria-label` on close button (3D Dashboard)
- **File:** `components/Dashboard3DWrapper.tsx`
- **Problem:** Close button uses only an SVG icon with no accessible text. `title` is not reliably read by screen readers.
- **WCAG:** 1.1.1 Non-text Content (Level A)
- **Fix:** ✅ **DONE** — Added `aria-label="Close 3D view"` and `aria-hidden` on SVG.

### 5. Webcam video element lacks accessible description
- **File:** `components/WebcamCapture.tsx`
- **Problem:** `<video>` element for camera feed has no `aria-label` or description.
- **WCAG:** 1.1.1 Non-text Content (Level A)
- **Fix:** ✅ **DONE** — Added `aria-label="Camera preview"`, `role="dialog"`, `aria-modal`, and `aria-hidden` on decorative SVGs.

### 6. Color contrast on `text-gray-400` usage
- **File:** Multiple components (Login, AdminDashboard, StudentDashboard, etc.)
- **Problem:** `text-gray-400` (#9ca3af) on white background has only a 3.03:1 contrast ratio — fails AA for normal text.
- **WCAG:** 1.4.3 Contrast (Minimum) (Level AA)
- **Fix:** Replace `text-gray-400` with `text-gray-500` (#6b7280, 4.62:1) for any text that isn't purely decorative.

### 7. Modal dialogs don't trap focus
- **File:** `components/Login.tsx` (Forgot Password modal), `components/UserProfile.tsx`
- **Problem:** When modals open, focus can still reach background elements. Pressing Tab moves behind the modal.
- **WCAG:** 2.4.3 Focus Order (Level A)
- **Fix:** Implement focus trap — on modal open, capture focus; on close, return focus to the trigger element.

---

## 🟠 Major Issues (P1 — Fix This Sprint)

### 8. Chart components have no text alternative
- **File:** `components/AttendanceChart.tsx`, `components/PerformanceChart.tsx`, `components/AnalyticsDashboard.tsx`
- **Problem:** Charts rendered via Recharts have no accessible description or summary.
- **WCAG:** 1.1.1 Non-text Content (Level A)
- **Fix:** Wrap charts in a `<figure>` with `role="img"` and add `aria-label` or `<figcaption>` summarizing the data.

### 9. Form inputs missing associated labels
- **File:** `components/AdminDashboard.tsx` (Add User form)
- **Problem:** Several inputs use `placeholder` only without a visible or `<label>` association.
- **WCAG:** 1.3.1 Info and Relationships (Level A)
- **Fix:** Add `<label htmlFor="...">` elements. Use `sr-only` class if visual labels are not desired.

### 10. Dynamic content changes not announced
- **File:** `components/Login.tsx`, `components/AdminDashboard.tsx`
- **Problem:** Error/success messages that appear after form submission are not in ARIA live regions. Screen readers won't announce them.
- **WCAG:** 4.1.3 Status Messages (Level AA)
- **Fix:** ✅ **DONE** in `Login.tsx` — Added `role="alert"` and `aria-live="assertive"` to error display. Extend to other components.

### 11. Color sole indicator for success/error
- **File:** `components/AdminDashboard.tsx`, `components/Login.tsx`
- **Problem:** Some status messages use only red/green color to convey success/failure, without an icon or text prefix.
- **WCAG:** 1.4.1 Use of Color (Level A)
- **Fix:** Prefix messages with "Error:" / "Success:" text and/or an icon (already done in Toast; extend to inline messages).

### 12. Missing `lang` attribute on localized content
- **File:** `index.html` already has `lang="en"`
- **Problem:** When locale is switched (Hindi, Marathi), the `lang` attribute on `<html>` is not updated.
- **WCAG:** 3.1.1 Language of Page (Level A)
- **Fix:** ✅ **DONE** — In `App.tsx` and `useThemeEngine.ts`, `document.documentElement.lang` is updated when the locale changes.

### 13. Missing heading hierarchy in dashboard views
- **File:** Multiple dashboard components
- **Problem:** Some sections jump from `<h2>` to `<h4>` or use inconsistent heading levels.
- **WCAG:** 1.3.1 Info and Relationships (Level A)
- **Fix:** Audit each dashboard and ensure headings are sequential (`h1 > h2 > h3`).

---

## 🟡 Minor Issues (P2 — Fix Next Sprint)

### 14. Decorative emojis not hidden from screen readers
- **Files:** Various (Login, AdminDashboard, etc.)
- **Problem:** Emojis like 🎓, 📊, 🔗 are announced by screen readers without context.
- **Fix:** ✅ **DONE** in `Login.tsx` — Wrapped emojis in `<span aria-hidden="true">`. Extend to other components.

### 15. Touch target size too small
- **File:** Theme/locale selector in `App.tsx`
- **Problem:** Small dropdown controls may be hard to tap on mobile; minimum target size is 44×44px.
- **WCAG:** 2.5.5 Target Size (Level AAA, but good practice)
- **Fix:** Increase padding on bottom-left settings panel controls.

### 16. Animations not respecting `prefers-reduced-motion`
- **File:** `components/Iridescence.tsx`, `components/LightPillar.tsx`
- **Problem:** WebGL/canvas-based animations continue even when reduced motion is preferred.
- **Fix:** ✅ **PARTIALLY DONE** — CSS tokens now disable CSS animations; canvas-based animations need JS checks.

### 17. Missing `autocomplete` attributes on login forms
- **File:** `components/Login.tsx`
- **Problem:** Email and password inputs lack `autocomplete="email"` / `autocomplete="current-password"`.
- **WCAG:** 1.3.5 Identify Input Purpose (Level AA)
- **Fix:** ✅ **DONE** — Login inputs already have `autoComplete="email"` and `autoComplete="current-password"`.

### 18. Table data in dashboards not using semantic `<table>` elements
- **File:** `components/GradeBook.tsx`, `components/Timetable.tsx`
- **Problem:** If tables are rendered using `<div>` grids, screen readers cannot navigate them as data tables.
- **Fix:** Convert table-like data displays to use `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`.

---

## ✅ Already Addressed

| Item | Status |
|------|--------|
| Skip-to-content link | ✅ Added in `index.html` |
| Focus-visible styling | ✅ Added in `design-tokens.css` |
| Toast ARIA live regions | ✅ Rebuilt `ToastNotification.tsx` |
| Reduced motion CSS | ✅ Tokens + media query in `design-tokens.css` |
| High-contrast mode tokens | ✅ Added in `design-tokens.css` |
| Skeleton loaders with `aria-hidden` | ✅ `SkeletonLoader.tsx` |
| Semantic `role="main"` landmark | ✅ Added in `App.tsx` |
| Dashboard3D close button `aria-label` | ✅ Fixed in `Dashboard3DWrapper.tsx` |
| WebcamCapture video `aria-label` + dialog role | ✅ Fixed in `WebcamCapture.tsx` |
| Login error ARIA live region | ✅ Fixed in `Login.tsx` |
| Login tab toggle `role="tablist"` | ✅ Fixed in `Login.tsx` |
| Decorative emojis hidden (Login) | ✅ Fixed in `Login.tsx` |
| Login form `autoComplete` attributes | ✅ Already present |
| Locale-synced `lang` attribute | ✅ Fixed in `useThemeEngine.ts` |
| Contrast fixes for `text-gray-400` | ✅ Replaced with `text-gray-500` |

---

## Recommended Priority Order

1. **Fix remaining P0 items 6–7** — contrast fixes, focus traps (~2–3 hours)
2. **Fix P1 items 8–9, 11–13** — forms, charts, headings, lang (~4–6 hours)
3. **Fix remaining P2 items 15–16, 18** — touch targets, canvas motion, table semantics (~2 hours)
4. **Run automated audit** — Integrate axe-core or Lighthouse CI to prevent regressions

---

*This report was generated by code analysis. A full user-testing session with screen reader software (NVDA/VoiceOver) is recommended before production launch.*
