# Navbar Backend Integration Guide

This document outlines all backend integration points required for the enterprise Navbar component to function with real data.

## Prerequisites

- Laravel API configured at `/apps/backend/laravel-api`
- Laravel Sanctum installed and configured
- CSRF protection enabled
- CORS properly configured
- Axios instance with interceptors

---

## 1. Authentication & User Management

### Endpoint: Get Current User
```http
GET /api/auth/user
```

**Headers:**
```
Authorization: Bearer {token}
Accept: application/json
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "name": "John Anderson",
    "email": "john.anderson@cyberiumshield.com",
    "role": "Security Analyst",
    "organization": "CyberiumShield Security Ops",
    "avatar": "https://cdn.example.com/avatars/user.jpg",
    "permissions": ["read:threats", "write:incidents"],
    "preferences": {
      "theme": "dark",
      "language": "en"
    }
  }
}
```

**Laravel Controller:**
```php
// app/Http/Controllers/API/AuthController.php
namespace App\Http\Controllers\API;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class AuthController extends Controller
{
    public function user(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->name,
                'organization' => $user->organization->name,
                'avatar' => $user->avatar_url,
                'permissions' => $user->permissions->pluck('name'),
                'preferences' => $user->preferences,
            ]
        ]);
    }
}
```

**React Integration:**
```typescript
// src/services/api/auth.ts
import { apiClient } from './client';

export const authApi = {
  getCurrentUser: async () => {
    const { data } = await apiClient.get('/api/auth/user');
    return data.data;
  },
};

// src/hooks/useCurrentUser.ts
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/services/api/auth';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.getCurrentUser,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Update ProfileDropdown.tsx
const { data: user, isLoading } = useCurrentUser();
```

---

## 2. Notifications System

### Endpoint: Get Notifications
```http
GET /api/notifications?limit=50&unread_only=false
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "critical",
      "title": "Critical Alert",
      "message": "Suspicious activity detected on server-01",
      "timestamp": "2026-07-20T10:30:00Z",
      "read": false,
      "link": "/threat-detection/threat-123",
      "metadata": {
        "severity": "critical",
        "source": "server-01"
      }
    }
  ],
  "meta": {
    "total": 150,
    "unread_count": 12
  }
}
```

### Endpoint: Mark Notifications as Read
```http
POST /api/notifications/mark-read
Content-Type: application/json

{
  "notification_ids": ["uuid1", "uuid2"]
}
```

**Laravel Controller:**
```php
// app/Http/Controllers/API/NotificationController.php
namespace App\Http\Controllers\API;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $limit = $request->get('limit', 50);
        $unreadOnly = $request->boolean('unread_only');
        
        $query = $user->notifications();
        
        if ($unreadOnly) {
            $query->whereNull('read_at');
        }
        
        $notifications = $query->latest()
            ->limit($limit)
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->data['title'],
                    'message' => $notification->data['message'],
                    'timestamp' => $notification->created_at,
                    'read' => $notification->read_at !== null,
                    'link' => $notification->data['link'] ?? null,
                    'metadata' => $notification->data['metadata'] ?? [],
                ];
            });
        
        return response()->json([
            'success' => true,
            'data' => $notifications,
            'meta' => [
                'total' => $user->notifications()->count(),
                'unread_count' => $user->unreadNotifications()->count(),
            ]
        ]);
    }
    
    public function markAsRead(Request $request)
    {
        $request->validate([
            'notification_ids' => 'required|array',
            'notification_ids.*' => 'uuid',
        ]);
        
        $user = $request->user();
        $user->notifications()
            ->whereIn('id', $request->notification_ids)
            ->update(['read_at' => now()]);
        
        return response()->json([
            'success' => true,
            'message' => 'Notifications marked as read'
        ]);
    }
}
```

**React Integration:**
```typescript
// src/services/api/notifications.ts
export const notificationsApi = {
  getNotifications: async (limit = 50, unreadOnly = false) => {
    const { data } = await apiClient.get('/api/notifications', {
      params: { limit, unread_only: unreadOnly }
    });
    return data;
  },
  
  markAsRead: async (notificationIds: string[]) => {
    const { data } = await apiClient.post('/api/notifications/mark-read', {
      notification_ids: notificationIds
    });
    return data;
  },
};

// src/hooks/useNotifications.ts
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getNotifications(50),
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
```

---

## 3. Global Search

### Endpoint: Search
```http
GET /api/search?q=server-01&type=device&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "uuid",
        "type": "device",
        "title": "Server-01",
        "subtitle": "192.168.1.100",
        "link": "/network/devices/server-01",
        "score": 0.95,
        "metadata": {
          "status": "online",
          "last_seen": "2026-07-20T10:00:00Z"
        }
      }
    ],
    "suggestions": [
      "server-01 logs",
      "server-01 incidents",
      "server-01 threats"
    ]
  },
  "meta": {
    "total": 42,
    "query": "server-01",
    "took_ms": 45
  }
}
```

**Laravel Controller:**
```php
// app/Http/Controllers/API/SearchController.php
namespace App\Http\Controllers\API;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Services\SearchService;

class SearchController extends Controller
{
    protected $searchService;
    
    public function __construct(SearchService $searchService)
    {
        $this->searchService = $searchService;
    }
    
    public function search(Request $request)
    {
        $request->validate([
            'q' => 'required|string|min:2',
            'type' => 'nullable|in:threat,incident,device,user,log,report,command',
            'limit' => 'nullable|integer|min:1|max:100'
        ]);
        
        $query = $request->get('q');
        $type = $request->get('type');
        $limit = $request->get('limit', 20);
        
        $startTime = microtime(true);
        
        $results = $this->searchService->search($query, $type, $limit);
        
        $took = round((microtime(true) - $startTime) * 1000);
        
        return response()->json([
            'success' => true,
            'data' => [
                'results' => $results,
                'suggestions' => $this->searchService->getSuggestions($query)
            ],
            'meta' => [
                'total' => count($results),
                'query' => $query,
                'took_ms' => $took
            ]
        ]);
    }
}
```

**React Integration:**
```typescript
// src/services/api/search.ts
export const searchApi = {
  search: async (query: string, type?: string, limit = 20) => {
    const { data } = await apiClient.get('/api/search', {
      params: { q: query, type, limit }
    });
    return data;
  },
};

// Update GlobalSearch.tsx with debounced search
import { useDebounce } from '@/hooks/useDebounce';

const debouncedQuery = useDebounce(query, 300);

const { data: searchResults } = useQuery({
  queryKey: ['search', debouncedQuery],
  queryFn: () => searchApi.search(debouncedQuery),
  enabled: debouncedQuery.length >= 2,
});
```

---

## 4. AI Status Monitoring

### Endpoint: Get AI Status
```http
GET /api/ai/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "online",
    "health_score": 98.5,
    "active_models": ["threat-detector", "malware-classifier"],
    "last_check": "2026-07-20T10:35:00Z",
    "metrics": {
      "requests_per_minute": 145,
      "average_latency_ms": 234,
      "error_rate": 0.002
    }
  }
}
```

**Laravel Controller:**
```php
// app/Http/Controllers/API/AIStatusController.php
namespace App\Http\Controllers\API;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Services\AIMonitorService;

class AIStatusController extends Controller
{
    protected $aiMonitor;
    
    public function __construct(AIMonitorService $aiMonitor)
    {
        $this->aiMonitor = $aiMonitor;
    }
    
    public function status()
    {
        $status = $this->aiMonitor->getStatus();
        
        return response()->json([
            'success' => true,
            'data' => $status
        ]);
    }
}
```

**React Integration:**
```typescript
// src/hooks/useAIStatus.ts
export function useAIStatus() {
  return useQuery({
    queryKey: ['aiStatus'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/ai/status');
      return data.data;
    },
    refetchInterval: 60000, // Poll every minute
  });
}

// Update AIStatusIndicator.tsx
const { data: aiStatus } = useAIStatus();
```

---

## 5. Environment Configuration

### Endpoint: Get System Environment
```http
GET /api/system/environment
```

**Response:**
```json
{
  "success": true,
  "data": {
    "environment": "production",
    "version": "1.2.3",
    "deployment_id": "deploy-abc123",
    "region": "us-east-1"
  }
}
```

**React Integration:**
```typescript
// Or use environment variable directly
const environment = import.meta.env.VITE_ENVIRONMENT || 'development';
```

---

## 6. Axios Client Configuration

### Create Secure Axios Instance

```typescript
// src/services/api/client.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true, // Important for Laravel Sanctum
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add CSRF token if available
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      config.headers['X-CSRF-TOKEN'] = csrfToken;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/auth/login';
    }
    
    if (error.response?.status === 419) {
      // CSRF token mismatch - refresh and retry
      window.location.reload();
    }
    
    return Promise.reject(error);
  }
);
```

---

## 7. Laravel Routes

Add these routes to `routes/api.php`:

```php
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\SearchController;
use App\Http\Controllers\API\AIStatusController;

Route::middleware(['auth:sanctum'])->group(function () {
    // Authentication
    Route::get('/auth/user', [AuthController::class, 'user']);
    
    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-read', [NotificationController::class, 'markAsRead']);
    
    // Search
    Route::get('/search', [SearchController::class, 'search']);
    
    // AI Status
    Route::get('/ai/status', [AIStatusController::class, 'status']);
    
    // System
    Route::get('/system/environment', function () {
        return response()->json([
            'success' => true,
            'data' => [
                'environment' => config('app.env'),
                'version' => config('app.version'),
            ]
        ]);
    });
});
```

---

## 8. WebSocket Integration (Optional)

For real-time notifications:

```typescript
// src/services/websocket.ts
import Pusher from 'pusher-js';

export const pusher = new Pusher(import.meta.env.VITE_PUSHER_KEY, {
  cluster: import.meta.env.VITE_PUSHER_CLUSTER,
  authEndpoint: `${import.meta.env.VITE_API_URL}/broadcasting/auth`,
});

// Subscribe to user notifications
export function subscribeToNotifications(userId: string, callback: (notification: any) => void) {
  const channel = pusher.subscribe(`private-user.${userId}`);
  channel.bind('notification.created', callback);
  return () => channel.unbind_all();
}
```

---

## 9. Testing Checklist

- [ ] User authentication flow
- [ ] Profile data loading
- [ ] Notification fetching
- [ ] Notification marking as read
- [ ] Search functionality
- [ ] AI status monitoring
- [ ] CSRF protection
- [ ] 401 redirect handling
- [ ] Error state handling
- [ ] Loading state handling
- [ ] WebSocket connection (if implemented)

---

## 10. Security Considerations

### ✅ Implemented
- No JWT in localStorage (use HttpOnly cookies)
- CSRF token on all mutations
- XSS prevention through React
- Input sanitization on search
- Rate limiting on API endpoints

### ⚠️ TODO
- Implement rate limiting on Laravel routes
- Add request validation on all endpoints
- Sanitize all user inputs on backend
- Implement API request logging
- Add role-based access control middleware

---

## Implementation Priority

1. **High Priority** (Required for basic functionality)
   - Authentication & User Management
   - Axios client configuration
   - CSRF setup

2. **Medium Priority** (Improves UX)
   - Notifications
   - Global Search
   - AI Status

3. **Low Priority** (Nice to have)
   - WebSocket for real-time updates
   - Advanced search filters
   - Notification preferences

---

## Environment Variables

Add to `.env`:

```env
# Frontend (.env)
VITE_API_URL=http://localhost:8000
VITE_ENVIRONMENT=development
VITE_PUSHER_KEY=your-pusher-key
VITE_PUSHER_CLUSTER=your-cluster

# Backend (.env)
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
SESSION_DOMAIN=localhost
```

---

## Next Steps

1. Create Laravel controllers listed above
2. Implement services (SearchService, AIMonitorService)
3. Set up Laravel Sanctum authentication
4. Configure CORS properly
5. Create Axios client with interceptors
6. Update Navbar components to use real data
7. Add loading and error states to all components
8. Test authentication flow end-to-end
9. Test all API endpoints with Postman
10. Deploy and monitor

---

## Support

For backend implementation questions, refer to:
- Laravel documentation: https://laravel.com/docs
- Laravel Sanctum: https://laravel.com/docs/sanctum
- TanStack Query: https://tanstack.com/query/latest
