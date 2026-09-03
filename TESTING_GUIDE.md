# Testing Guide - Dashboard Fixes

## Prerequisites
1. Navigate to the web app directory: `cd apps/web`
2. Install dependencies (if not done): `npm install`
3. Start the development server: `npm run dev`
4. Open browser to: `http://localhost:5173`

## Test Scenarios

### 1. Theme Toggle Testing 🎨

#### Test 1.1: Switch to Light Theme
1. Look for the theme toggle button in the navbar (moon icon by default)
2. Click the theme toggle button
3. Select "Light" from the dropdown
4. **Expected Results:**
   - Page background changes from dark (#0B1120) to light (#f8fafc)
   - Text changes from light colors to dark colors
   - All cards and components adapt to light theme
   - Theme selection persists after page refresh

#### Test 1.2: Switch to Dark Theme
1. Click the theme toggle button
2. Select "Dark" from the dropdown
3. **Expected Results:**
   - Page background changes to dark (#0B1120)
   - Text changes to light colors
   - All cards and components use dark theme
   - Theme selection persists after page refresh

#### Test 1.3: System Theme
1. Click the theme toggle button
2. Select "System" from the dropdown
3. **Expected Results:**
   - Theme matches your OS/browser theme preference
   - If you change OS theme, app theme updates automatically
   - System preference persists after page refresh

#### Test 1.4: Theme Persistence
1. Select any theme (Light/Dark/System)
2. Refresh the page (F5 or Ctrl+R)
3. Navigate to different pages
4. Close and reopen the browser
5. **Expected Results:**
   - Theme choice is remembered across all scenarios

---

### 2. Language Selector Testing 🌐

#### Test 2.1: Switch to Nepali
1. Look for the language selector in the navbar (flag icon 🇬🇧)
2. Click the language selector
3. Select "नेपाली 🇳🇵"
4. **Expected Results:**
   - Dashboard title changes to "सुरक्षा ड्यासबोर्ड"
   - Stat cards show Nepali text
   - Language selection persists after page refresh

#### Test 2.2: Switch to English
1. Click the language selector
2. Select "English 🇬🇧"
3. **Expected Results:**
   - All text reverts to English
   - Dashboard shows "Security Dashboard"
   - Language selection persists after page refresh

#### Test 2.3: Language Persistence
1. Select Nepali language
2. Navigate to Security Center page
3. Refresh the page
4. Navigate back to Dashboard
5. **Expected Results:**
   - Language stays as Nepali throughout

---

### 3. Quick Actions Testing ⚡

#### Test 3.1: New Scan
1. Click "Quick Actions" button in navbar (+ icon)
2. Select "New Scan" from the dropdown
3. **Expected Results:**
   - Modal opens with "New Security Scan" title
   - Form shows scan type dropdown (Full, Quick, Vulnerability, etc.)
   - Optional target input field is available
   - Can close modal by clicking X, Cancel, or outside
4. Fill in the form:
   - Select "Full System Scan"
   - Enter target: "192.168.1.0/24"
   - Click "Start Scan"
5. **Expected Results:**
   - Console logs the scan details
   - Modal closes
   - (Future: Scan starts and shows progress)

#### Test 3.2: New Incident
1. Click "Quick Actions" → "New Incident"
2. **Expected Results:**
   - Modal opens with "Report New Incident" title
   - Form shows required fields: Title, Severity, Category
   - Description textarea is available
3. Fill in the form:
   - Title: "Suspicious Login Activity"
   - Severity: "High"
   - Category: "Unauthorized Access"
   - Description: "Multiple failed login attempts detected"
   - Click "Create Incident"
4. **Expected Results:**
   - Console logs the incident details
   - Modal closes
   - (Future: Incident created in system)

#### Test 3.3: Generate Report
1. Click "Quick Actions" → "Generate Report"
2. **Expected Results:**
   - Modal opens with "Generate Report" title
   - Dropdowns for Report Type, Format, and Date Range
3. Configure report:
   - Type: "Security Summary"
   - Format: "PDF"
   - Date Range: "Last 7 Days"
   - Click "Generate"
4. **Expected Results:**
   - Button shows "Generating..." with spinner
   - After 2 seconds, success alert shows
   - Modal closes
   - (Future: Actual report downloads)

#### Test 3.4: Ask AI
1. Click "Quick Actions" → "Ask AI"
2. **Expected Results:**
   - Redirects to `/ai-assistant` page
   - AI Assistant page loads successfully

#### Test 3.5: Add User
1. Click "Quick Actions" → "Add User"
2. **Expected Results:**
   - Modal opens with "Add New User" title
   - Form shows fields: Name, Email, Role, Department
3. Fill in the form:
   - Name: "John Doe"
   - Email: "john.doe@company.com"
   - Role: "Security Analyst"
   - Department: "Security Operations"
   - Click "Add User"
4. **Expected Results:**
   - Console logs the user details
   - Modal closes
   - (Future: User added to system)

---

### 4. Security Center Generate Report Testing 📊

#### Test 4.1: Generate Report from Security Center
1. Navigate to Security Center page (`/security-center`)
2. Look for "Generate Report" button in the top right
3. Click the button
4. **Expected Results:**
   - Same Report Modal opens as in Quick Actions
   - All functionality works identically
   - Can select different report types and formats
   - Generate button works correctly

#### Test 4.2: Security Center Report Types
1. In Security Center, click "Generate Report"
2. Test each report type:
   - Security Summary
   - Threat Analysis
   - Vulnerability Assessment
   - Compliance Report
   - Incident Log
   - Audit Trail
3. **Expected Results:**
   - All report types selectable
   - Format options available for each
   - Generate works for all types

---

### 5. Mobile/Responsive Testing 📱

#### Test 5.1: Mobile Menu
1. Resize browser to mobile size (< 1024px width)
2. **Expected Results:**
   - Hamburger menu appears
   - Theme toggle visible in mobile menu
   - Language selector visible in mobile menu
   - Quick actions accessible

#### Test 5.2: Modal Responsiveness
1. On mobile view, open any modal (Scan, Incident, Report, User)
2. **Expected Results:**
   - Modal scales appropriately
   - All form fields are accessible
   - Buttons are easily tappable
   - Can scroll within modal if needed

---

### 6. Cross-Browser Testing 🌐

Test all features in:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (Mac/iOS)

#### Expected Results:
- All themes work identically
- Modals render correctly
- Animations are smooth
- No console errors

---

### 7. Edge Cases Testing 🔍

#### Test 7.1: Rapid Theme Switching
1. Quickly switch between themes multiple times
2. **Expected Results:**
   - No flickering or lag
   - Theme always applies correctly
   - No console errors

#### Test 7.2: Multiple Modal Opens
1. Open a modal
2. Without closing, try to interact with page
3. **Expected Results:**
   - Page is blocked (backdrop works)
   - Can only close modal or submit
   - No z-index issues

#### Test 7.3: Form Validation
1. Open New Incident modal
2. Try to submit without filling required fields
3. **Expected Results:**
   - Browser validation prevents submission
   - Required field indicators show

#### Test 7.4: Escape Key
1. Open any modal
2. Press Escape key
3. **Expected Results:**
   - Modal closes smoothly
   - Animation plays correctly

---

## Known Limitations (To Be Implemented)

1. **API Integration**: Modals log to console but don't actually:
   - Start scans
   - Create incidents
   - Generate real reports
   - Add users to database

2. **Translation Coverage**: Only common UI elements translated
   - Dashboard stats labels
   - Security Center headers
   - Quick actions labels
   - Common buttons

3. **Report Generation**: Currently simulated with 2-second delay
   - No actual PDF/Excel generation
   - No file download

4. **Form Validation**: Basic HTML5 validation only
   - No custom validation messages
   - No async validation (email uniqueness, etc.)

---

## Success Criteria ✅

All tests should pass with:
- ✅ No console errors
- ✅ Smooth animations
- ✅ Persistent preferences
- ✅ Responsive design works
- ✅ All modals functional
- ✅ Theme/language switching works
- ✅ Quick actions all work
- ✅ Security Center report works

---

## Troubleshooting

### Issue: Theme not persisting
**Solution**: Check browser localStorage is enabled and not full

### Issue: Modal won't close
**Solution**: Check for JavaScript errors in console

### Issue: Translations not showing
**Solution**: Verify LanguageContext is properly wrapped in app

### Issue: Quick Actions not appearing
**Solution**: Check that you're logged in (protected route)

### Issue: Build warnings about CSS
**Solution**: These are normal for escaped CSS classes like `.bg-\[#0B1120\]`

---

## Developer Notes

### Console Logs for Testing
All modals log their data to console with:
```javascript
console.log('Action name:', { data... })
```

Check browser console (F12) to verify form submissions.

### LocalStorage Keys
- `cyberiumshield_theme`: Stores theme preference
- `cyberiumshield_language`: Stores language preference
- `cyberiumshield_user`: Stores authenticated user data

### Context Values
Use React DevTools to inspect:
- ThemeContext: `{ theme, actualTheme, setTheme }`
- LanguageContext: `{ language, setLanguage, t }`
- AuthContext: `{ user, isAuthenticated, login, logout }`
