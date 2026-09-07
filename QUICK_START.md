# Quick Start Guide - Fixed Features

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd apps/web
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Open in Browser
Navigate to: `http://localhost:5173`

---

## ✅ What's Been Fixed

### 1. **Theme Toggle** (Light/Dark/System)
- **Location**: Top navbar (moon/sun icon)
- **How to Test**: Click icon → Select theme → Refresh page
- **Expected**: Theme persists and applies correctly

### 2. **Language Selector** (English/Nepali)
- **Location**: Top navbar (flag icon)
- **How to Test**: Click icon → Select language → Check translations
- **Expected**: Language persists and UI translates

### 3. **Quick Actions** (All 5 buttons)
- **Location**: Top navbar ("Quick Actions" button)
- **Buttons**:
  1. ✅ New Scan → Opens scan configuration modal
  2. ✅ New Incident → Opens incident report modal
  3. ✅ Generate Report → Opens report generation modal
  4. ✅ Ask AI → Navigates to AI Assistant page
  5. ✅ Add User → Opens user creation modal

### 4. **Security Center Generate Report**
- **Location**: Security Center page (top right button)
- **How to Test**: Navigate to `/security-center` → Click "Generate Report"
- **Expected**: Report modal opens with all options

---

## 🎯 Quick Test Checklist

### Theme Testing (30 seconds)
```
1. Click theme toggle (navbar)
2. Select "Light"
   → Background should turn white/light
3. Select "Dark"
   → Background should turn dark
4. Refresh page (F5)
   → Theme should persist
```

### Language Testing (30 seconds)
```
1. Click language selector (navbar)
2. Select "नेपाली 🇳🇵"
   → Dashboard title becomes "सुरक्षा ड्यासबोर्ड"
3. Select "English 🇬🇧"
   → Dashboard title becomes "Security Dashboard"
4. Refresh page (F5)
   → Language should persist
```

### Quick Actions Testing (2 minutes)
```
1. Click "Quick Actions" button (navbar)
2. Click "New Scan"
   → Modal opens with scan form
   → Fill form and click "Start Scan"
   → Modal closes (check console for log)

3. Click "Quick Actions" → "New Incident"
   → Modal opens with incident form
   → Fill form and click "Create Incident"
   → Modal closes (check console for log)

4. Click "Quick Actions" → "Generate Report"
   → Modal opens with report options
   → Select options and click "Generate"
   → Shows "Generating..." then success message

5. Click "Quick Actions" → "Ask AI"
   → Redirects to AI Assistant page

6. Click "Quick Actions" → "Add User"
   → Modal opens with user form
   → Fill form and click "Add User"
   → Modal closes (check console for log)
```

### Security Center Testing (1 minute)
```
1. Navigate to Security Center
   URL: /security-center or click in sidebar

2. Click "Generate Report" button (top right)
   → Same report modal as Quick Actions
   → Select report type and format
   → Click "Generate"
   → Success!
```

---

## 🔍 Visual Indicators

### Theme Working
- **Dark Mode**: Black/navy background (#0B1120)
- **Light Mode**: White/light gray background (#f8fafc)
- **System Mode**: Matches your OS theme

### Language Working
- **English**: "Security Dashboard", "Active Threats", etc.
- **Nepali**: "सुरक्षा ड्यासबोर्ड", "सक्रिय खतराहरू", etc.

### Modals Working
- Smooth fade-in animation
- Backdrop blur effect
- Click outside or X to close
- Forms submit and log to console

---

## 📝 Important Notes

### 1. Console Logs
All form submissions currently log to browser console:
- Press F12 to open Developer Tools
- Go to "Console" tab
- Submit a form and see the data logged

### 2. Persistence
Theme and language choices are saved to localStorage:
- Persist across page refreshes
- Persist across browser sessions
- Persist across navigation

### 3. API Integration (TODO)
Current implementation:
- ✅ UI fully functional
- ✅ Forms validate
- ✅ Data collected
- ⏳ Backend integration pending (see TODO comments in code)

---

## 🐛 Troubleshooting

### Theme Not Changing?
1. Check browser console for errors (F12)
2. Clear localStorage: `localStorage.clear()` in console
3. Refresh page

### Language Not Persisting?
1. Check localStorage is enabled in browser
2. Try incognito/private mode
3. Clear cache and reload

### Modals Not Opening?
1. Check console for JavaScript errors
2. Verify you're logged in (try /auth/login)
3. Check network tab for failed requests

### Quick Actions Button Missing?
1. Verify you're on a protected route (/dashboard, /security-center)
2. Check you're logged in
3. Try mobile menu (hamburger icon)

---

## 💻 Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type check
npm run type-check

# Lint code
npm run lint
```

---

## 📁 Key Files Changed

### New Files
- `src/contexts/ThemeContext.tsx` - Theme management
- `src/contexts/LanguageContext.tsx` - Translation management
- `src/components/modals/ScanModal.tsx` - Scan form
- `src/components/modals/IncidentModal.tsx` - Incident form
- `src/components/modals/ReportModal.tsx` - Report generator
- `src/components/modals/AddUserModal.tsx` - User form
- `src/components/modals/index.ts` - Modal exports

### Updated Files
- `src/main.tsx` - Added providers
- `src/app/App.tsx` - Added AuthProvider
- `src/components/Navbar/ThemeToggle.tsx` - Uses ThemeContext
- `src/components/Navbar/LanguageSelector.tsx` - Uses LanguageContext
- `src/components/Navbar/QuickActionsMenu.tsx` - Added modal integration
- `src/pages/SecurityCenter/SecurityCenterPage.tsx` - Added report modal
- `src/styles/global.css` - Added theme variables and light mode
- `tailwind.config.js` - Added dark mode support

---

## 🎉 Success Indicators

If everything works, you should see:
- ✅ Theme toggle changes page appearance
- ✅ Language selector translates UI text
- ✅ Quick Actions shows 5 clickable options
- ✅ Each Quick Action opens its respective modal/page
- ✅ Security Center "Generate Report" opens modal
- ✅ All modals can be opened, filled, and submitted
- ✅ Console logs show submitted data
- ✅ Preferences persist after refresh
- ✅ No errors in browser console
- ✅ Build completes successfully

---

## 📚 Next Steps

After verifying everything works:

1. **API Integration**: Connect modals to backend endpoints
2. **Real Reports**: Implement PDF/Excel generation
3. **Scan Engine**: Use the integrated authorized scanner under `/vulnerability`
4. **User Management**: Complete CRUD operations
5. **Notifications**: Add toast/alert system
6. **Progress Tracking**: Show scan/report progress
7. **More Languages**: Add Spanish, French, etc.

See `TESTING_GUIDE.md` for comprehensive test scenarios.

---

## 🆘 Need Help?

1. Check browser console (F12) for errors
2. Review `TESTING_GUIDE.md` for detailed tests
3. Verify all dependencies installed: `npm install`
4. Try fresh build: `rm -rf node_modules dist && npm install && npm run build`

---

## ✨ Features Summary

| Feature | Status | Location |
|---------|--------|----------|
| Light Theme | ✅ Working | Navbar → Theme Toggle |
| Dark Theme | ✅ Working | Navbar → Theme Toggle |
| System Theme | ✅ Working | Navbar → Theme Toggle |
| English Language | ✅ Working | Navbar → Language Selector |
| Nepali Language | ✅ Working | Navbar → Language Selector |
| New Scan | ✅ Working | Quick Actions → New Scan |
| New Incident | ✅ Working | Quick Actions → New Incident |
| Generate Report (Quick) | ✅ Working | Quick Actions → Generate Report |
| Ask AI | ✅ Working | Quick Actions → Ask AI |
| Add User | ✅ Working | Quick Actions → Add User |
| Generate Report (Security) | ✅ Working | Security Center → Generate Report |
| Theme Persistence | ✅ Working | Auto-saved to localStorage |
| Language Persistence | ✅ Working | Auto-saved to localStorage |

**All features tested and working! 🎉**
