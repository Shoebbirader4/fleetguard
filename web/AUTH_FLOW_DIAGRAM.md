# FleetGuard AI Authentication Flow Diagram

## 1. Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Login Flow                          │
└─────────────────────────────────────────────────────────────────┘

User                LoginPage           Supabase Auth      Database        AuthStore         Dashboard
  │                     │                     │               │               │                 │
  │  Enter credentials  │                     │               │               │                 │
  ├────────────────────>│                     │               │               │                 │
  │                     │                     │               │               │                 │
  │                     │ signInWithPassword()│               │               │                 │
  │                     ├────────────────────>│               │               │                 │
  │                     │                     │               │               │                 │
  │                     │ JWT Token + User    │               │               │                 │
  │                     │<────────────────────┤               │               │                 │
  │                     │                     │               │               │                 │
  │                     │  Fetch user profile │               │               │                 │
  │                     ├───────────────────────────────────>│               │                 │
  │                     │                     │               │               │                 │
  │                     │  User profile data  │               │               │                 │
  │                     │<───────────────────────────────────┤               │                 │
  │                     │                     │               │               │                 │
  │                     │  setAuth(user, token)               │               │                 │
  │                     ├───────────────────────────────────────────────────>│                 │
  │                     │                     │               │               │                 │
  │                     │  Store in localStorage              │               │                 │
  │                     │                     │               │    ┌──────────┴──────────┐      │
  │                     │                     │               │    │ user: {...}         │      │
  │                     │                     │               │    │ accessToken: "..."  │      │
  │                     │                     │               │    │ isAuthenticated: true│     │
  │                     │                     │               │    └─────────────────────┘      │
  │                     │                     │               │               │                 │
  │  Redirect to dashboard                   │               │               │                 │
  │<────────────────────┤                     │               │               │                 │
  │                     │                     │               │               │                 │
  │  Load dashboard     │                     │               │               │                 │
  ├───────────────────────────────────────────────────────────────────────────────────────────>│
  │                     │                     │               │               │                 │
```

## 2. API Call Flow (with JWT Interceptor)

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Call with JWT Token                       │
└─────────────────────────────────────────────────────────────────┘

Component          Axios Instance      Interceptor        Supabase       API Endpoint
   │                     │                  │                │               │
   │  vehicleApi.getAll()│                  │                │               │
   ├────────────────────>│                  │                │               │
   │                     │                  │                │               │
   │                     │ Request          │                │               │
   │                     ├─────────────────>│                │               │
   │                     │                  │                │               │
   │                     │              Get JWT from session │               │
   │                     │                  ├───────────────>│               │
   │                     │                  │                │               │
   │                     │              JWT Token            │               │
   │                     │                  │<───────────────┤               │
   │                     │                  │                │               │
   │                     │    Add Authorization header       │               │
   │                     │    "Bearer <token>"               │               │
   │                     │                  │                │               │
   │                     │    Request with JWT               │               │
   │                     ├───────────────────────────────────────────────────>│
   │                     │                  │                │               │
   │                     │    Response data                  │               │
   │                     │<───────────────────────────────────────────────────┤
   │                     │                  │                │               │
   │  Response data      │                  │                │               │
   │<────────────────────┤                  │                │               │
   │                     │                  │                │               │
```

## 3. Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Token Refresh Flow                          │
└─────────────────────────────────────────────────────────────────┘

Component      Axios Instance    Interceptor    Supabase Auth    API Endpoint
   │                 │                │               │                │
   │  API Request    │                │               │                │
   ├────────────────>│                │               │                │
   │                 │                │               │                │
   │                 │  Add JWT token │               │                │
   │                 ├───────────────>│               │                │
   │                 │                │               │                │
   │                 │  Request       │               │                │
   │                 ├───────────────────────────────────────────────>│
   │                 │                │               │                │
   │                 │  401 Unauthorized              │                │
   │                 │<───────────────────────────────────────────────┤
   │                 │                │               │                │
   │                 │  Refresh token │               │                │
   │                 │                ├──────────────>│                │
   │                 │                │               │                │
   │                 │      New JWT token             │                │
   │                 │                │<──────────────┤                │
   │                 │                │               │                │
   │                 │  Retry with new token          │                │
   │                 ├───────────────────────────────────────────────>│
   │                 │                │               │                │
   │                 │  Success response              │                │
   │                 │<───────────────────────────────────────────────┤
   │                 │                │               │                │
   │  Response data  │                │               │                │
   │<────────────────┤                │               │                │
   │                 │                │               │                │
```

## 4. Password Reset Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Password Reset Flow                         │
└─────────────────────────────────────────────────────────────────┘

User          PasswordResetPage    Supabase Auth       Email        UpdatePasswordPage
  │                  │                   │                │                 │
  │  Enter email     │                   │                │                 │
  ├─────────────────>│                   │                │                 │
  │                  │                   │                │                 │
  │                  │ resetPasswordForEmail()             │                 │
  │                  ├──────────────────>│                │                 │
  │                  │                   │                │                 │
  │                  │                   │ Send reset email                 │
  │                  │                   ├───────────────>│                 │
  │                  │                   │                │                 │
  │  Success message │                   │                │                 │
  │<─────────────────┤                   │                │                 │
  │                  │                   │                │                 │
  │  Check email     │                   │                │                 │
  │                  │                   │                │                 │
  │  Click reset link in email           │                │                 │
  ├───────────────────────────────────────────────────────────────────────>│
  │                  │                   │                │                 │
  │                  │                   │  PASSWORD_RECOVERY event         │
  │                  │                   ├─────────────────────────────────>│
  │                  │                   │                │                 │
  │  Enter new password                  │                │                 │
  ├───────────────────────────────────────────────────────────────────────>│
  │                  │                   │                │                 │
  │                  │                   │  updateUser()  │                 │
  │                  │                   │<───────────────────────────────────┤
  │                  │                   │                │                 │
  │  Redirect to login                   │                │                 │
  │<───────────────────────────────────────────────────────────────────────┤
  │                  │                   │                │                 │
```

## 5. Logout Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                          Logout Flow                             │
└─────────────────────────────────────────────────────────────────┘

User         Dashboard      AuthStore        Supabase Auth      LoginPage
  │               │              │                  │                │
  │  Click logout │              │                  │                │
  ├──────────────>│              │                  │                │
  │               │              │                  │                │
  │               │  logout()    │                  │                │
  │               ├─────────────>│                  │                │
  │               │              │                  │                │
  │               │              │  signOut()       │                │
  │               │              ├─────────────────>│                │
  │               │              │                  │                │
  │               │              │  Success         │                │
  │               │              │<─────────────────┤                │
  │               │              │                  │                │
  │               │              │  clearAuth()     │                │
  │               │              │  ┌─────────────────────────┐     │
  │               │              │  │ user: null              │     │
  │               │              │  │ accessToken: null       │     │
  │               │              │  │ isAuthenticated: false  │     │
  │               │              │  └─────────────────────────┘     │
  │               │              │                  │                │
  │               │  Redirect to login              │                │
  │               ├─────────────────────────────────────────────────>│
  │               │              │                  │                │
  │  Login page   │              │                  │                │
  │<──────────────────────────────────────────────────────────────────┤
  │               │              │                  │                │
```

## 6. Protected Route Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Protected Route Access                       │
└─────────────────────────────────────────────────────────────────┘

User         Router      ProtectedRoute    AuthStore      Supabase      DashboardPage
  │             │              │               │              │              │
  │  /dashboard │              │               │              │              │
  ├────────────>│              │               │              │              │
  │             │              │               │              │              │
  │             │  Render      │               │              │              │
  │             ├─────────────>│               │              │              │
  │             │              │               │              │              │
  │             │              │ checkSession()│              │              │
  │             │              ├──────────────>│              │              │
  │             │              │               │              │              │
  │             │              │               │ getSession() │              │
  │             │              │               ├─────────────>│              │
  │             │              │               │              │              │
  │             │              │               │ Valid session│              │
  │             │              │               │<─────────────┤              │
  │             │              │               │              │              │
  │             │              │  isAuthenticated: true        │              │
  │             │              │<──────────────┤              │              │
  │             │              │               │              │              │
  │             │              │  Render children             │              │
  │             │              ├──────────────────────────────────────────>│
  │             │              │               │              │              │
  │  Dashboard loaded          │               │              │              │
  │<───────────────────────────────────────────────────────────────────────┤
  │             │              │               │              │              │
```

## 7. Session Timeout Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Session Timeout Flow                        │
└─────────────────────────────────────────────────────────────────┘

Timer         AuthStore      Supabase Auth      Router        LoginPage
  │               │                │               │               │
  │  24 hours     │                │               │               │
  │  elapsed      │                │               │               │
  ├──────────────>│                │               │               │
  │               │                │               │               │
  │               │ checkSession() │               │               │
  │               ├───────────────>│               │               │
  │               │                │               │               │
  │               │ Token expired  │               │               │
  │               │<───────────────┤               │               │
  │               │                │               │               │
  │               │ clearAuth()    │               │               │
  │               │ ┌──────────────────────┐       │               │
  │               │ │ user: null           │       │               │
  │               │ │ accessToken: null    │       │               │
  │               │ │ isAuthenticated: false│      │               │
  │               │ └──────────────────────┘       │               │
  │               │                │               │               │
  │               │ Emit SIGNED_OUT event          │               │
  │               ├───────────────────────────────>│               │
  │               │                │               │               │
  │               │                │   Redirect to login           │
  │               │                │               ├──────────────>│
  │               │                │               │               │
```

## 8. Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Component Architecture                        │
└─────────────────────────────────────────────────────────────────┘

                           App.tsx
                              │
                 ┌────────────┼────────────┐
                 │            │            │
            LoginPage   PasswordResetPage  Router
                 │            │            │
                 │            │      ProtectedRoute
                 │            │            │
                 │            │       DashboardPage
                 │            │
                 └────────────┴─────── useAuthStore
                                           │
                                      AuthStore
                                     (Zustand)
                                           │
                              ┌────────────┼────────────┐
                              │            │            │
                         setAuth()    clearAuth()   logout()
                              │            │            │
                              └────────────┴────────────┘
                                           │
                                    Supabase Auth
                                           │
                              ┌────────────┼────────────┐
                              │            │            │
                         signIn()    signOut()    getSession()
                              │            │            │
                              └────────────┴────────────┘


                           Axios Instance
                                │
                    ┌───────────┼───────────┐
                    │           │           │
             Request      Response      Error
            Interceptor  Interceptor  Handler
                    │           │           │
                    └───────────┴───────────┘
                                │
                          API Endpoints
                                │
                    ┌───────────┼───────────┐
                    │           │           │
              vehicleApi   alertApi   workOrderApi
```

## 9. Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        Data Flow Summary                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│   Browser    │
│ (localStorage)│
└──────┬───────┘
       │
       │ Persists
       ▼
┌──────────────┐    Manages      ┌──────────────┐
│  AuthStore   │◄───────────────│   useAuth    │
│  (Zustand)   │                 │    Hook      │
└──────┬───────┘                 └──────────────┘
       │                                │
       │ Stores                         │ Consumes
       │                                │
       ▼                                ▼
┌──────────────┐                 ┌──────────────┐
│ User Profile │                 │  Components  │
│    Data      │                 │  (Pages)     │
└──────────────┘                 └──────────────┘
       │
       │ Authenticates via
       ▼
┌──────────────┐    Validates    ┌──────────────┐
│ Supabase     │◄───────────────│   Database   │
│   Auth       │                 │  (users)     │
└──────┬───────┘                 └──────────────┘
       │
       │ Issues
       ▼
┌──────────────┐    Includes in  ┌──────────────┐
│  JWT Token   │────────────────►│ API Requests │
└──────────────┘                 │ (Axios)      │
                                 └──────────────┘
```

## 10. Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        Security Layers                           │
└─────────────────────────────────────────────────────────────────┘

Layer 1: Client-Side Validation
├── Email format validation
├── Password length validation
├── Password complexity validation
└── Form field sanitization

Layer 2: Transport Security
├── HTTPS/TLS encryption
├── Secure cookies
└── CORS policies

Layer 3: Authentication
├── Supabase Auth validation
├── JWT token generation
├── Token expiration (24 hours)
└── Refresh token rotation

Layer 4: Authorization
├── Role-based access control
├── Protected routes
├── Session validation
└── RLS policies

Layer 5: Storage Security
├── JWT in secure session
├── Encrypted localStorage
├── No sensitive data in plain text
└── Auto-cleanup on logout

Layer 6: API Security
├── JWT token in headers
├── Automatic token refresh
├── Request timeout (30s)
└── Error handling
```

---

## Legend

```
│  : Vertical line (connection)
├─ : Branch right
└─ : Branch right (end)
┌─ : Top left corner
┐  : Top right corner
└─ : Bottom left corner
┘  : Bottom right corner
─  : Horizontal line
►  : Arrow right
▼  : Arrow down
◄  : Arrow left
```

---

## Notes

1. All flows assume proper Supabase configuration
2. JWT tokens are stored securely by Supabase client
3. Session timeout is configurable (default 24 hours)
4. Error handling is included at each step
5. All communication uses HTTPS in production
6. RLS policies enforce tenant isolation at database level
