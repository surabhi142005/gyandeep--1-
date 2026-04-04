# Mobile Compatibility Testing Guide

## Quick Testing Checklist

### DevTools Mobile Simulation
1. Open Chrome DevTools (F12)
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Test each device below

### Device Test Matrix

| Device | Width | Test Focus | Expected Result |
|--------|-------|------------|----------------|
| iPhone SE | 320px | Horizontal scroll, buttons | No overflow, all buttons tappable |
| iPhone 14 | 390px | Header, modal, keyboard | Header fits, modal centered, keyboard works |
| Pixel 7 | 412px | Sidebar, charts | Sidebar collapses, charts responsive |
| iPad Mini | 768px | Desktop layout | Full sidebar visible |

### Network Tests
- **Fast 3G**: App loads < 3 seconds
- **4x CPU slowdown**: UI remains responsive

---

## Manual Testing on Real Devices

### iOS Safari Testing
1. Open Safari on iPhone/iPad
2. Navigate to your app URL
3. Test each scenario:

```
[ ] No 300ms tap delay on buttons
    - Tap button rapidly, should respond immediately

[ ] No auto-zoom when focusing inputs
    - Tap email/password field
    - Keyboard should appear WITHOUT page zooming

[ ] Fixed elements stable when keyboard opens
    - Open login form
    - Fixed header should NOT jump

[ ] Bottom elements above home indicator
    - Look at bottom of screen
    - No content hidden by iPhone home bar

[ ] Smooth momentum scrolling
    - Swipe up/down in lists
    - Should feel native, not stuck
```

### Android Chrome Testing
```
[ ] Back button works
    - Navigate through app
    - Press back - should go to previous page

[ ] No layout shift when address bar hides
    - Scroll page
    - Address bar should auto-hide smoothly

[ ] Charts resize properly
    - View analytics dashboard
    - Charts should fill available width
```

---

## CSS Classes Available for Mobile

### Safe Area Support
```html
<div class="safe-area-top">    <!-- Top safe area -->
<div class="safe-area-bottom">   <!-- Bottom safe area -->
<div class="safe-area-all">      <!-- All sides -->
```

### iOS Overflow Scrolling
```html
<div class="ios-overflow-scroll">
```

### Touch Optimization
```html
<!-- Already applied to buttons via touch-action: manipulation -->
<!-- No additional classes needed -->
```

### Viewport Height
```css
/* Dynamic viewport height for mobile browsers */
height: 100dvh;
```

---

## Known Mobile Issues & Solutions

### Issue: Horizontal Scroll on Small Screens
**Check**: `index.html` has `overflow-x: hidden` on body
**Fix**: Already applied

### Issue: Buttons Too Small
**Check**: All buttons have minimum 44x44px touch target
**Fix**: Verified in Button.tsx size classes

### Issue: iOS Auto-Zoom on Input Focus
**Check**: Input font-size >= 16px
**Fix**: Applied `fontSize: '16px'` to Input.tsx and Login.tsx

### Issue: Fixed Elements Hidden by Home Bar
**Check**: Safe area padding applied
**Fix**: `.safe-area-bottom` class applied to fixed elements

---

## Performance Benchmarks

| Metric | Target | How to Test |
|--------|--------|-------------|
| FCP | < 1.5s | Lighthouse > Network tab |
| LCP | < 2.5s | Lighthouse > Network tab |
| CLS | < 0.1 | Lighthouse > Performance |
| TTI | < 3.5s | Lighthouse |

---

## Browser Support Matrix

| Feature | iOS Safari | Android Chrome | Notes |
|---------|------------|---------------|-------|
| touch-action | 13+ | 67+ | Polyfilled for older |
| -webkit-overflow-scrolling | 5+ | N/A | iOS only |
| dvh viewport units | 15+ | 71+ | Polyfilled |
| Safe area insets | 11+ | 71+ | env() function |

---

## Quick Fix Reference

If a test fails, check these files:

| Issue | File | Line |
|-------|------|------|
| Tap delay | Button.tsx | 109 |
| iOS scroll | design-tokens.css | ~530 |
| Auto-zoom | Input.tsx | 89 |
| Safe area | Modal.tsx | 47 |
| Viewport | index.html | 35-40 |
