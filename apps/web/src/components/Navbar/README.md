# Enterprise Security Operations Center Navbar

A production-grade, enterprise-level navigation bar designed for Security Operations Center (SOC) software, inspired by industry leaders like Microsoft Defender XDR, CrowdStrike Falcon, IBM QRadar, Palo Alto Cortex, and Splunk Enterprise Security.

## Features

### Left Section
- **CyberiumShield AI Logo**: Clickable brand logo with gradient styling
- **Organization Name**: Displays current workspace/organization
- **Breadcrumb Navigation**: Dynamic breadcrumbs based on current route
- **Responsive Design**: Hamburger menu on mobile devices

### Center Section
- **Global Search Bar**: 
  - Keyboard shortcut: `Ctrl + K` / `Cmd + K`
  - Search across: Threats, Incidents, Devices, Users, Logs, Reports, Commands
  - Recent searches history
  - Search suggestions
  - Keyboard navigation support
  - Real-time search results
  - TODO: Backend integration pending

### Right Section
1. **AI Status Indicator**
   - Live AI health monitoring
   - States: Online (green), Degraded (yellow), Offline (red)
   - Animated pulse effect
   - Hover tooltip

2. **Notification Center**
   - Real-time notification dropdown
   - Unread count badge
   - Notification types: Critical, Threat, Incident, System
   - Mark all as read functionality
   - Timestamp display
   - TODO: Backend integration pending

3. **Quick Actions Menu**
   - New Scan
   - New Incident
   - Generate Report
   - Ask AI
   - Add User
   - TODO: Backend integration pending

4. **Environment Badge**
   - Production (red)
   - Development (blue)
   - Testing (yellow)

5. **Theme Toggle**
   - Dark mode
   - Light mode
   - System preference
   - Smooth transitions

6. **Language Selector**
   - English
   - Nepali (नेपाली)
   - TODO: i18n integration pending

7. **Profile Dropdown**
   - User avatar with initials fallback
   - Name, email, role display
   - Organization info
   - Profile settings
   - API Keys access
   - Security settings
   - Logout functionality

## Component Structure

```
Navbar/
├── Navbar.tsx                  # Main navbar component
├── AIStatusIndicator.tsx       # AI health status indicator
├── EnvironmentBadge.tsx        # Environment label (prod/dev/test)
├── ThemeToggle.tsx            # Theme switcher
├── LanguageSelector.tsx       # Language/locale selector
├── NotificationDropdown.tsx   # Notification center
├── QuickActionsMenu.tsx       # Quick action shortcuts
├── ProfileDropdown.tsx        # User profile menu
├── GlobalSearch.tsx           # Global search with Ctrl+K
├── types.ts                   # TypeScript type definitions
├── index.ts                   # Barrel export
└── README.md                  # This file
```

## Security Features

### ✅ Implemented
- No JWT exposure in React state
- No API keys in component state
- Secure user information handling
- XSS prevention through React's default escaping
- Sanitized user-generated content
- No unsafe HTML rendering
- Protected profile information display
- Secure routing with React Router

### ⚠️ TODO: Backend Integration Required
- HttpOnly cookies with Laravel Sanctum
- CSRF token handling
- Secure Axios interceptors
- API endpoint authentication
- Session management
- Role-based access control

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: Proper ARIA attributes
- **Screen Reader Support**: Descriptive labels and announcements
- **Focus Indicators**: Visible focus states
- **Tab Navigation**: Logical tab order
- **Escape Key**: Closes all dropdowns and dialogs

## Performance Optimizations

- Lazy-loaded dropdowns
- Memoized components with `React.memo`
- Debounced search (300ms)
- `useCallback` for event handlers
- `useMemo` for computed values
- Virtualization-ready for large result sets

## Responsive Design

### Desktop (≥1024px)
- Full navbar with all features visible
- Horizontal layout
- Search bar in center
- All controls accessible

### Tablet (768px - 1023px)
- Condensed layout
- Some labels hidden
- Icons remain visible
- Search bar accessible

### Mobile (<768px)
- Hamburger menu
- Slide-out navigation
- Touch-friendly targets (44x44px minimum)
- Stacked layout in mobile menu

## Animations

All animations powered by **Framer Motion**:
- Fade transitions
- Slide animations
- Scale effects
- Hover glow effects
- Notification badge pulse
- Dropdown enter/exit animations
- Mobile menu slide

## Backend Integration Status

### ⏳ Endpoints Needed

```typescript
// TODO: Implement these Laravel API endpoints

GET /api/auth/user
// Response: { id, name, email, role, organization, avatar }

GET /api/notifications
// Response: { data: Notification[] }

POST /api/notifications/mark-read
// Body: { notificationIds: string[] }

GET /api/search
// Query: { q: string, type?: string }
// Response: { results: SearchResult[] }

GET /api/ai/status
// Response: { status: 'online' | 'degraded' | 'offline' }

GET /api/system/environment
// Response: { environment: 'production' | 'development' | 'testing' }
```

### Integration Steps

1. **Create API Service Layer**
   ```typescript
   // src/services/api/navbar.ts
   import axios from 'axios';
   
   export const navbarApi = {
     getCurrentUser: () => axios.get('/api/auth/user'),
     getNotifications: () => axios.get('/api/notifications'),
     markNotificationsRead: (ids: string[]) => 
       axios.post('/api/notifications/mark-read', { notificationIds: ids }),
     search: (query: string) => 
       axios.get('/api/search', { params: { q: query } }),
     getAIStatus: () => axios.get('/api/ai/status'),
   };
   ```

2. **Use TanStack Query**
   ```typescript
   const { data: user } = useQuery({
     queryKey: ['currentUser'],
     queryFn: navbarApi.getCurrentUser,
   });
   ```

3. **Update Components**
   - Replace mock data with API calls
   - Add loading states
   - Handle error states
   - Implement optimistic updates

## Usage

```tsx
import { Navbar } from '@/components/Navbar';

function DashboardLayout() {
  return (
    <div>
      <Navbar />
      {/* Rest of layout */}
    </div>
  );
}
```

## Theme Customization

The navbar inherits from the global theme defined in `global.css` and `tailwind.config.js`:

```css
/* Primary background */
background: #0B1120

/* Glassmorphism */
backdrop-blur-xl
bg-[#0B1120]/80

/* Accent colors */
cyan-400, blue-500 (primary)
red-400 (critical)
yellow-400 (warnings)
green-400 (success)
```

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

## Known Limitations

1. Search is currently mock data
2. Notifications are hardcoded
3. AI status is static
4. Quick actions log to console
5. Theme persistence not implemented
6. Language switching not wired to i18n

## Future Enhancements

- [ ] Real-time notification via WebSockets
- [ ] Advanced search filters
- [ ] Command palette (Cmd+K) with actions
- [ ] User presence indicators
- [ ] Keyboard shortcut customization
- [ ] Notification sound preferences
- [ ] Advanced user preferences
- [ ] Multi-organization switching
- [ ] Recent activity timeline
- [ ] Integrated help/support chat

## Contributing

When adding new features:
1. Follow existing component patterns
2. Add TypeScript types to `types.ts`
3. Maintain accessibility standards
4. Add animations with Framer Motion
5. Ensure responsive design
6. Update this README
7. Add security considerations

## License

Proprietary - CyberiumShield AI Platform
