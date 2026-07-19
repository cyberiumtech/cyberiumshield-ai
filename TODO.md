# CyberiumShield AI - Implementation TODO

## Phase 1: Frontend bootstrapping
- [ ] Replace placeholder `apps/web/vite.config.ts` with real Vite+React config.
- [ ] Create missing Vite entry files: `apps/web/index.html`, `apps/web/src/main.tsx`, global CSS.
- [ ] Add TailwindCSS + dark-first theme tokens.
- [ ] Ensure React Router, React Query wiring.

## Phase 2: Layouts & navigation
- [ ] Implement `LandingLayout`, `AuthLayout`, `DashboardLayout`.
- [ ] Implement TopNav (logo, global search, notifications, AI status, profile/settings, dark toggle).
- [ ] Implement LeftSidebar with all navigation sections.
- [ ] Add route guard scaffold for authenticated routes (mock for now).

## Phase 3: Reusable enterprise UI components
- [ ] Implement UI primitives (Card, Badge, Table, Dialog, Skeleton, Tooltip, Progress).
- [ ] Implement widgets (stat cards, chart shells, empty states, toasts).

## Phase 4: Pages (functional with mock data)
- [ ] Dashboard page: stat cards + charts + recent incidents.
- [ ] Security Center: Overview/Incidents/Alerts/Response Center.
- [ ] Threat Detection: live updating table + actions.
- [ ] Network Monitoring: widgets + charts.
- [ ] Vulnerability Management: scan button, scan history, CVE cards, patch recommendations.
- [ ] Threat Intelligence: IOC search, MITRE matrix view (mock), feed, trending.
- [ ] Malware Detection: file scanner + hash analysis + sandbox reports.
- [ ] Phishing Detection: URL scanner, email scanner, QR scanner.
- [ ] Log Analysis: system/auth logs and event viewer.
- [ ] AI Security Assistant: ChatGPT-like chat w/ markdown + code highlighting.
- [ ] Reports: generate reports and export (mock).
- [ ] Administration: users, roles, permissions, audit logs, settings (mock).
- [ ] Help Center: FAQ / knowledge base (mock).

## Phase 5: API-ready architecture
- [ ] Create mock API service layer behind Axios-shaped interface.
- [ ] Add React Query hooks for each feature.

## Phase 6: Polish
- [ ] Framer Motion animations across shell + loading states.
- [ ] Ensure responsiveness + premium spacing.
- [ ] Smoke test build and dev server.

