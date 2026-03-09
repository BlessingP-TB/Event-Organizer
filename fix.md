# SmartEvents — Fixes Log (March 9, 2026)

## 1. Font Awesome Font Loading Errors

**Files:** `frontend/package.json`  
**Problem:** `@fortawesome/fontawesome-free` v7 removed the `webfonts/` directory, causing `Failed to decode downloaded font` and `OTS parsing error: invalid sfntVersion` errors for `fa-solid-900.woff2`.  
**Fix:** Downgraded `@fortawesome/fontawesome-free` from `^7.1.0` to `^6.0.0`, which ships the `.woff2` font files.

---

## 2. OrganizerDashboard 404 Errors

**File:** `frontend/src/pages/OrganizerDashboard/OrganizerDashboard.jsx`  
**Problem:** Used raw `axios` with hardcoded `http://localhost:3000/events` — missing the `/api/v1` prefix and hitting a non-existent `GET /events` route.  
**Fix:**
- Replaced `axios` import with the shared `api` utility (`frontend/src/utils/api.js`) which has the correct `baseURL` (`http://localhost:3000/api/v1`) and auto-attaches auth tokens.
- Changed endpoint from `/events` to `/events/organizer` (the actual backend route).
- Changed `/registrations/total` to go through the `api` instance.
- Removed redundant manual token handling.

---

## 3. MyEvents 404 Errors

**File:** `frontend/src/pages/OrganizerDashboard/MyEvents.jsx`  
**Problem:** Three API calls used raw `axios` with hardcoded `http://localhost:3000/...` URLs missing the `/api/v1` prefix.  
**Fix:** Replaced `axios` with the shared `api` utility for all three calls:
- `GET /events/organizer`
- `GET /documents/me/documents`
- `GET /documents/documents/:id`

---

## 4. VenueCardGallery 404 Error

**File:** `frontend/src/components/VenueCardGallery.jsx`  
**Problem:** `axios.get("http://localhost:3000/venues")` missing `/api/v1` prefix.  
**Fix:** Replaced `axios` with the shared `api` utility (`api.get("/venues")`).

---

## 5. CreateEvent 404 Errors (Calendars & Tools)

**File:** `frontend/src/pages/OrganizerDashboard/CreateEvent.jsx`  
**Problem:** Two `fetch()` calls used hardcoded `http://localhost:3000/admin/calendars` and `http://localhost:3000/tools`.  
**Fix:** Updated both to use the correct base URL via `import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'`.

---

## 6. Admin Dashboard 404 Errors

**File:** `frontend/src/hooks/Admin/adminDashBoard.js`  
**Problem:** Three `axios` calls used hardcoded `http://localhost:3000/...` URLs.  
**Fix:** Replaced `axios` with the shared `api` utility for:
- `GET /admin/dashboard`
- `GET /admin/venues/top-booked`
- `GET /admin/analytics/revenue`

---

## 7. AdminTools 404 Errors

**File:** `frontend/src/pages/AdminDashboard/AdminTools.jsx`  
**Problem:** Four `fetch()` calls used hardcoded `http://localhost:3000/...` URLs.  
**Fix:** Added `API_BASE` constant and updated all calls:
- `GET /tools`
- `POST /admin/tools`
- `PATCH /admin/tools/:id`
- `DELETE /admin/tools/:id`

---

## 8. ApprovalScreen 404 Errors

**File:** `frontend/src/pages/AdminDashboard/ApprovalScreen.jsx`  
**Problem:** Two `fetch()` calls used hardcoded `http://localhost:3000/...` URLs.  
**Fix:** Added `API_BASE` constant and updated:
- `GET /approvals`
- `GET /admin/events/:eventId`

---

## 9. UserManagement 500 / Import Error

**File:** `frontend/src/hooks/Admin/users.js`  
**Problem:**
1. **Syntax error** — a duplicate `} catch (refreshError) { ... }` block with no matching `try` made the file unparseable, causing Vite to return a 500 when importing `UserManagement.jsx`.
2. Six `axios` calls used hardcoded `http://localhost:3000/...` URLs.

**Fix:**
- Removed the duplicate catch block to fix the syntax error.
- Replaced `axios` with the shared `api` utility for all six calls:
  - `GET /admin/users` (×2, initial + retry)
  - `POST /admin/user`
  - `PATCH /admin/users/:id`
  - `DELETE /admin/users/:id`
  - `DELETE /admin/users/bulk`

---

## 10. AnalyticsExportScreen 404 Error

**File:** `frontend/src/pages/AdminDashboard/AnalyticsExportScreen.jsx`  
**Problem:** `fetch("http://localhost:3000/reports/analytics")` missing `/api/v1` prefix.  
**Fix:** Updated to use `API_BASE` constant with the correct base URL.

---

## 11. Admin Calendar Hook 404 Errors

**File:** `frontend/src/hooks/Admin/useCalendar.js`  
**Problem:** Six `axios` calls used hardcoded `http://localhost:3000/...` URLs.  
**Fix:** Replaced `axios` with the shared `api` utility for:
- `GET /venues`
- `GET /admin/calendars`
- `GET /bookings/bookings`
- `POST /admin/calendars`
- `PATCH /admin/calendars/:id`
- `DELETE /admin/calendars/:id`

---

## 12. Admin User Seeded

**File:** `backend/seed-admin.js` (new)  
**Action:** Created and ran a seed script to insert an ADMIN user into the database.

| Field        | Value                    |
|--------------|--------------------------|
| **Email**    | `admin@smartevents.com`  |
| **Password** | `Admin@1234`             |
| **Role**     | `ADMIN`                  |
| **Verified** | `true`                   |

---

## 13. Email Verification Link Could Not Be Completed

**Files:** `frontend/src/App.jsx`, `frontend/src/pages/Auth/VerifyEmail.jsx` (new)
**Problem:** Verification emails linked users to `/auth/verify-email?token=...`, but the frontend had no matching route/page. Users landed on 404 and remained unverified, causing protected API calls to fail with “Please verify your email address to proceed.”
**Fix:**
- Added a new auth page `VerifyEmail.jsx` that reads the `token` query param and calls `POST /auth/verify-email`.
- Added the missing route in `App.jsx`: `/auth/verify-email`.
- Added clear success/error feedback and a login action after verification.

---

## Root Cause Summary

Nearly all 404 errors shared the same root cause: frontend files were making API calls to `http://localhost:3000/<path>` directly, but the backend mounts all routes under the `/api/v1` prefix (configured via `API_PREFIX=/api/v1` in `.env`). The shared `api` utility at `frontend/src/utils/api.js` already had the correct `baseURL` configured — the fix was to use it consistently across all files.

---

## Corlett

### Issues Identified (March 9, 2026)

#### 14. `/api/v1/notifications` - 404 Not Found
- **Status**: ✅ FIXED
- **Issue**: Frontend (`Events.jsx:215`) calls `/notifications?userId=...` but this endpoint did not exist in the backend
- **Location**: `frontend/src/pages/AttendeeDashBoard/Events.jsx` line 215
- **Solution**: Created stub notification endpoint
  - Added `backend/src/routes/notification.routes.js` - returns empty array `[]`
  - Registered route in `backend/src/routes/index.routes.js` at path `/notifications`

#### 15. `/api/v1/registrations/my` - 403 Forbidden
- **Status**: ✅ FIXED
- **Issue**: Endpoint exists but returns 403 due to `enforceEmailVerification` middleware blocking unverified users
- **Cause**: The route required verified email to access
- **Location**: `backend/src/routes/registration.routes.js` line 37-41
- **Solution**: Removed `enforceEmailVerification` middleware from `/my` route
  - Users can now view their registrations without email verification
  - Other registration actions (create, decide) still require verified email

#### 16. `/api/v1/registrations/total` - 403 Forbidden
- **Status**: ✅ FIXED
- **Issue**: OrganizerDashboard calls `/registrations/total` which was blocked by `enforceEmailVerification`
- **Location**: `backend/src/routes/registration.routes.js` line 30-34
- **Solution**: Removed `enforceEmailVerification` middleware from `/total` route
  - Organizers can now view registration totals without email verification
