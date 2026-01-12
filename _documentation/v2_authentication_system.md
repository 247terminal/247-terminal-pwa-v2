# 247 Terminal v2.0 - Authentication System

**Date:** 2025-01-09
**Status:** Planning Phase

---

## 1. Executive Summary

This document outlines the authentication system for 247 Terminal v2, addressing UX issues in v1 and implementing 2025 best practices for license-key-based authentication.

### Goals
- **Seamless auto-login** - No user interaction if valid session exists
- **Minimal friction** - License modal overlay instead of separate page
- **Secure token handling** - Follow modern security practices
- **Graceful session management** - Background refresh, offline support

---

## 2. Current v1 Implementation Analysis

### 2.1 How It Works

**Files Analyzed:**
- `/247-terminal-pwa/src/modules/auth/auth.service.js`
- `/247-terminal-pwa/src/pages/login.page.js`

**Flow:**
1. User navigates to login page
2. Enters license key manually (or auto-filled from storage)
3. Clicks "Login" button
4. License validated against backend
5. Session token returned and stored
6. Redirected to terminal

### 2.2 What Gets Stored (localStorage) - v1

| Key | Purpose |
|-----|---------|
| `session_token` | Token from license validation |
| `is_admin` | Admin status flag |
| `temp_license` | Current license key |
| `temp_uid` | User/membership ID |
| `247terminal_settings` | Encrypted settings object |
| `autologin_timestamp` | Last auto-login attempt time |

### 2.2.1 What v2 Will Store (localStorage)

| Key | Purpose |
|-----|---------|
| `session_token` | JWT from license validation |
| `247terminal_settings` | User settings object |

**Not stored in v2:** License key (handled by browser credential manager)

### 2.3 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/app/license/validate` | POST | Validate license + get session token |
| `/v1/app/license/reset` | POST | Reset license metadata (retry mechanism) |
| `/v1/server-settings` | GET | Retrieve saved settings from server |
| `/v1/settings/decrypt` | POST | Decrypt server-stored settings |

---

## 3. Issues with v1 Implementation

| Issue | Impact | Severity |
|-------|--------|----------|
| **Manual login required** | Even with stored credentials, user must click login button | High |
| **Separate login page** | Extra navigation step, feels slow | Medium |
| **10-second auto-login cooldown** | Prevents loops but doesn't help UX | Medium |
| **Tokens in localStorage** | Security risk - vulnerable to XSS | High |
| **No silent session validation** | Always shows login UI first | Medium |
| **No session refresh** | Token expiry requires full re-login | Medium |

---

## 4. 2025 Best Practices Research

### 4.1 Authentication UX (Sources)

From [Authgear Login/Signup UX Guide](https://www.authgear.com/post/login-signup-ux-guide):
- 88% of users won't return after bad UX
- Passkeys/passwordless preferred where possible
- MFA should offer multiple options (not just SMS)

From [Frontegg Authentication Guide](https://frontegg.com/blog/authentication):
- Adaptive/risk-based authentication is the gold standard
- Security should be "invisible during normal use"

From [LogRocket Modal UX](https://blog.logrocket.com/ux-design/modal-ux-best-practices/):
- Modals ideal for quick, focused tasks
- Separate pages for complex multi-step flows
- Inline alternatives for non-urgent actions

### 4.2 Token Security

From [NextNative Mobile Auth Best Practices](https://nextnative.dev/blog/mobile-authentication-best-practices):
- **Never store tokens in localStorage** - vulnerable to XSS
- Use httpOnly cookies (set by backend) for session tokens
- Short-lived access tokens + refresh tokens
- Rotate tokens aggressively

From [Strapi Authentication Methods](https://strapi.io/blog/6-Authentication-Methods-for-Secure-Web-Applications):
- JWT with proper signature validation
- Always validate expiration server-side
- OAuth 2.1 + PKCE for secure flows

### 4.3 2FA Considerations

- 2FA blocks the vast majority of account compromise attacks
- Should be offered but not forced for all users
- **Preferred approach:** TOTP (Google Authenticator, Authy, etc.)

---

## 5. Recommended v2 Strategy

### 5.1 Core Principles

1. **Silent-first authentication** - Check token validity before showing any login UI
2. **Modal over page** - License input as overlay, not separate route
3. **Token-only storage** - Store JWT token, not license key (browser handles that)
4. **Graceful degradation** - Work offline with cached session while token valid

### 5.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         APP LOAD                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                 ┌────────────────────────┐
                 │  Check localStorage for │
                 │     session_token       │
                 └───────────┬────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌─────────────────┐          ┌─────────────────┐
     │   Has Token      │          │    No Token      │
     └────────┬────────┘          └────────┬────────┘
              │                             │
              ▼                             │
     ┌─────────────────┐                    │
     │  Decode JWT &    │                   │
     │  Check Expiry    │                   │
     └────────┬────────┘                    │
              │                             │
       ┌──────┴──────┐                      │
       │             │                      │
       ▼             ▼                      ▼
   ┌───────┐    ┌────────┐         ┌─────────────────┐
   │ Valid │    │Expired │         │  Show License   │
   └───┬───┘    └───┬────┘         │     Modal       │
       │            │              │ (browser can    │
       │            └─────────────►│  autofill)      │
       │                           └────────┬────────┘
       │                                    │
       │                                    ▼
       │                           ┌─────────────────┐
       │                           │  Validate with   │
       │                           │  backend, get    │
       │                           │  new token       │
       │                           └────────┬────────┘
       │                                    │
       ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      RENDER TERMINAL                             │
└─────────────────────────────────────────────────────────────────┘
```

**Key points:**
- We only store the JWT token, not the license key
- Browser's credential manager handles license key autofill
- Token validated locally (JWT expiry check) before rendering
- If expired → user re-enters license key (browser autofills)

### 5.3 UX Design Decision: Modal Overlay

**Why Modal Instead of Separate Page:**

| Aspect | Separate Page | Modal Overlay |
|--------|---------------|---------------|
| First impression | Blank login page | App visible (blurred) behind |
| Perceived speed | Feels like extra step | Feels instant |
| Context | User doesn't see what they're logging into | User sees the terminal |
| Navigation | Requires routing | No route change |
| Implementation | More complex routing | Simpler state-based |

**Modal Behavior:**
- App renders with terminal layout (blurred/dimmed)
- License modal centered on screen
- Cannot interact with background until authenticated
- Single input field + "Activate" button
- Error messages inline

### 5.4 Token Handling Strategy

**Backend Implementation (Confirmed):**
- JWT token returned in response body (`data.token`)
- No httpOnly cookies - frontend must store token
- Token valid for 7 days
- Must send as `Authorization: Bearer {token}` header

```
Browser                          Backend
   │                                │
   │  POST /v1/app/license/validate │
   │  { license_key }               │
   │ ──────────────────────────────►│
   │                                │
   │  200 OK                        │
   │  { data: { token: "jwt..." }}  │
   │ ◄──────────────────────────────│
   │                                │
   │  Store token in localStorage   │
   │  Send: Authorization: Bearer   │
```

**Frontend Storage:**
```typescript
// Store ONLY the token after successful validation
localStorage.setItem('session_token', data.token);
// DO NOT store license_key - let browser credential manager handle it

// Use token for authenticated requests
headers: { 'Authorization': `Bearer ${token}` }
```

### 5.5 Session Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                      SESSION LIFECYCLE                           │
└─────────────────────────────────────────────────────────────────┘

1. CREATION (on successful login)
   └── Store: session_token only (in localStorage)
   └── Token contains: exp claim (7 days from creation)

2. VALIDATION (on app load / focus)
   └── Check token expiry locally (decode JWT exp claim)
   └── If valid → render terminal
   └── If expired → show license modal (browser autofills)

3. RE-AUTHENTICATION (when token expires)
   └── User re-enters license key (browser autofills)
   └── POST /v1/app/license/validate { license_key }
   └── Receive new token + store it
   └── Note: No silent refresh - requires user to submit license

4. TERMINATION (logout)
   └── Clear session_token from localStorage
   └── Show license modal
```

**Important:**
- No silent refresh possible (we don't store license key)
- Token valid for 7 days, then user must re-authenticate
- Browser's credential manager makes re-auth quick (autofill)
- WebSocket connections extend backend Redis session, but not the JWT

---

## 6. Component Architecture

### 6.1 Directory Structure

```
src/
├── components/
│   └── auth/
│       ├── auth_guard.tsx        # Wrapper checking auth state
│       ├── license_modal.tsx     # Modal overlay for license input
│       ├── license_input.tsx     # Styled input component
│       └── auth_loading.tsx      # Loading state during validation
│
├── services/
│   └── auth/
│       ├── auth.service.ts       # Core auth logic
│       ├── session.service.ts    # Session management
│       └── types.ts              # Auth-related types
│
├── hooks/
│   └── use_auth.ts               # Auth state hook
│
├── stores/
│   └── auth.store.ts             # Auth state signals
│
└── types/
    └── auth.types.ts             # Shared auth types
```

### 6.2 Component Specifications

#### AuthGuard (Wrapper Component)

**Purpose:** Wraps the entire app, manages auth state rendering

```tsx
// src/components/auth/auth_guard.tsx

interface AuthGuardProps {
    children: ComponentChildren;
}

export function AuthGuard({ children }: AuthGuardProps) {
    // 1. On mount: check existing session
    // 2. If valid session → render children (terminal)
    // 3. If no session → render LicenseModal over blurred children
    // 4. If validating → render AuthLoading
}
```

**States:**
- `loading` - Checking session validity
- `authenticated` - Valid session, render app
- `unauthenticated` - No valid session, show modal

#### LicenseModal (Login UI)

**Purpose:** Overlay modal for license key entry

```tsx
// src/components/auth/license_modal.tsx

export function LicenseModal() {
    // Single input for license key
    // "Activate" button
    // Error message display
    // Loading state during validation
}
```

**Design:**
- Centered modal (max-width: 400px)
- Dark semi-transparent backdrop
- Logo at top
- License input field
- "Activate" button (btn-primary)
- Error message (text-error)
- Optional: "Remember this device" checkbox

#### LicenseInput (Input Component)

**Purpose:** Styled license key input with validation

```tsx
// src/components/auth/license_input.tsx

interface LicenseInputProps {
    value: string;
    on_change: (value: string) => void;
    error?: string;
    disabled?: boolean;
}

export function LicenseInput(props: LicenseInputProps) {
    // Input with monospace font
    // Uppercase transformation
    // Format: XXXX-XXXX-XXXX-XXXX (optional)
}
```

### 6.3 Service Specifications

#### AuthService

**Purpose:** Core authentication logic

```typescript
// src/services/auth/auth.service.ts

interface AuthService {
    validate_license(license_key: string): Promise<AuthResult>;
    validate_session(): Promise<boolean>;
    refresh_session(): Promise<boolean>;
    logout(): void;
    get_current_user(): User | null;
}

interface AuthResult {
    success: boolean;
    token?: string;
    user?: User;
    error?: string;
}

interface User {
    id: string;
    email: string;
    license_key: string;
    is_admin: boolean;
    membership_status: string;
    membership_expires: string;
}
```

#### SessionService

**Purpose:** Manage session state and persistence

```typescript
// src/services/auth/session.service.ts

interface SessionService {
    save_session(session: Session): void;
    get_session(): Session | null;
    clear_session(): void;
    is_session_valid(): boolean;
    get_time_until_expiry(): number;
}

interface Session {
    token: string;
    license_key: string;
    user_id: string;
    expires_at: number;
}
```

### 6.4 State Management (Signals)

```typescript
// src/stores/auth.store.ts

import { signal, computed } from '@preact/signals';

interface AuthState {
    status: 'loading' | 'authenticated' | 'unauthenticated';
    user: User | null;
    error: string | null;
}

export const auth_state = signal<AuthState>({
    status: 'loading',
    user: null,
    error: null,
});

export const is_authenticated = computed(() =>
    auth_state.value.status === 'authenticated'
);

export const is_loading = computed(() =>
    auth_state.value.status === 'loading'
);
```

---

## 7. API Contract (Verified Against Backend)

### 7.1 License Validation

**Endpoint:** `POST /v1/app/license/validate`

**Request:**
```json
{
    "license_key": "XXXX-XXXX-XXXX-XXXX"
}
```

**Response (Valid License):**
```json
{
    "success": true,
    "status": "success",
    "message": "license valid",
    "data": {
        "valid": true,
        "is_admin": false,
        "is_global_key": false,
        "email": "user@example.com",
        "membership_id": "mem_123",
        "status": "active",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
            "email": "user@example.com",
            "membership_id": "mem_123",
            "is_global_key": false,
            "expires_at": "2025-12-31T23:59:59Z"
        },
        "cached": false
    }
}
```

**Response (Invalid License):**
```json
{
    "success": true,
    "status": "success",
    "message": "license invalid",
    "data": {
        "valid": false,
        "is_admin": false,
        "is_global_key": false,
        "email": null,
        "membership_id": null,
        "status": null,
        "cached": false
    }
}
```

**Error Responses:**
- `400` - Missing license key or validation failure
- `429` - Rate limited (15 requests per 15 minutes)

### 7.2 Session Refresh

**No dedicated refresh endpoint.** To refresh a session, call `/v1/app/license/validate` again with the stored license key. The backend will return a new JWT token.

```typescript
// Refresh strategy - call validate again
const refresh_session = async (license_key: string) => {
    const response = await fetch('/v1/app/license/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key })
    });
    const { data } = await response.json();
    if (data.valid) {
        localStorage.setItem('session_token', data.token);
    }
    return data;
};
```

### 7.3 License Reset

**Endpoint:** `POST /v1/app/license/reset`

**Request:**
```json
{
    "license_key": "XXXX-XXXX-XXXX-XXXX"
}
```

**Response:**
```json
{
    "success": true,
    "data": {
        "reset": true,
        "is_global_key": false
    }
}
```

---

## 8. Implementation Checklist

### Phase 1: Core Services
- [ ] `src/services/auth/types.ts` - Type definitions
- [ ] `src/services/auth/session.service.ts` - Session management
- [ ] `src/services/auth/auth.service.ts` - Core auth logic
- [ ] `src/stores/auth.store.ts` - Auth state signals
- [ ] `src/hooks/use_auth.ts` - Auth hook

### Phase 2: Components
- [ ] `src/components/auth/license_input.tsx` - Input component
- [ ] `src/components/auth/license_modal.tsx` - Modal overlay
- [ ] `src/components/auth/auth_loading.tsx` - Loading state
- [ ] `src/components/auth/auth_guard.tsx` - App wrapper

### Phase 3: Integration
- [ ] Wrap `App` with `AuthGuard`
- [ ] Test auto-login flow
- [ ] Test manual login flow
- [ ] Test session expiry handling
- [ ] Test offline behavior

### Phase 4: Polish
- [ ] Error message copy
- [ ] Loading animations
- [ ] Keyboard navigation (Enter to submit)
- [ ] Accessibility (ARIA labels)

---

## 9. Security Considerations

### 9.1 Token Storage Strategy

**Decision:** Store JWT token in localStorage, do NOT store license key.

| What | Storage | Rationale |
|------|---------|-----------|
| JWT Token | localStorage | Time-limited (7 days), acceptable risk |
| License Key | Browser credential manager | Never persisted by our code |

**Why this approach:**
- If token is stolen via XSS → attacker has 7-day access (limited)
- If license key is stolen → attacker has permanent access (much worse)
- Browser's built-in password manager handles license key securely

**User flow:**
1. User enters license key (browser offers to save it)
2. We store only the JWT token
3. Token expires after 7 days → user re-enters license key (browser autofills)

### 9.2 XSS Mitigation Strategies

Since localStorage is vulnerable to XSS, we implement defense-in-depth:

- Strict Content Security Policy (CSP) headers
- No `dangerouslySetInnerHTML` or `eval()`
- Input sanitization throughout the app
- Regular dependency audits (`npm audit`)
- Subresource Integrity (SRI) for external scripts

### 9.3 Rate Limiting

- Auth endpoint: 15 requests per 15 minutes
- Backend enforced, frontend should handle 429 gracefully

### 9.4 Future Enhancements (P2+)

- [ ] **httpOnly cookies** - Requires backend changes, coordinate with all apps
- [ ] **Optional 2FA** - TOTP-based (Google Authenticator, Authy compatible)
- [ ] Google SSO integration
- [ ] Device management UI (see active devices)
- [ ] Revoke sessions remotely

---

## 10. Testing Strategy

### Unit Tests
- `session.service.test.ts` - Session storage/retrieval
- `auth.service.test.ts` - Validation logic
- `token.utils.test.ts` - JWT decoding and expiry checks

### Integration Tests
- Full login flow with mocked API
- Auto-login with valid stored session
- Session expiry and refresh
- Error handling (invalid key, network error)

### E2E Tests
- First-time user login
- Returning user auto-login
- Logout and re-login
- Session timeout behavior

---

## 11. References

- [Authgear: Login & Signup UX Guide 2025](https://www.authgear.com/post/login-signup-ux-guide)
- [Frontegg: What Is User Authentication 2025](https://frontegg.com/blog/authentication)
- [LogRocket: Modal UX Best Practices](https://blog.logrocket.com/ux-design/modal-ux-best-practices/)
- [NextNative: Mobile Authentication Best Practices 2025](https://nextnative.dev/blog/mobile-authentication-best-practices)
- [Strapi: 6 Authentication Methods](https://strapi.io/blog/6-Authentication-Methods-for-Secure-Web-Applications)
- [Userpilot: Modal UX Design 2025](https://userpilot.com/blog/modal-ux-design/)
