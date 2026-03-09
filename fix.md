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

## 13. Ntiyiso — CreateEvent Venue/Date Selection Bug

**File:** `frontend/src/pages/OrganizerDashboard/CreateEvent.jsx`  
**Problem:** Selecting a venue made date selection fail or become overly restrictive because availability checks were too strict (payload shape/type mismatches and empty-calendar scenarios).  
**Fix:**
- Added robust slot matching for both `venueIds` and `venueId` formats.
- Normalized ID/date matching logic to prevent false mismatches.
- Prevented hard lockouts when calendar data is empty/not loaded.
- Relaxed validation so date/time availability errors are only shown when relevant slot data actually exists.

---

## 14. Organizer Confirm Submit 404 Error

**File:** `frontend/src/pages/OrganizerDashboard/ConfirmEventDetails.jsx`  
**Problem:** Event submit used hardcoded `http://localhost:3000/events` and theme submit used `http://localhost:3000/themes/`, both missing `/api/v1`.  
**Fix:**
- Replaced raw URL requests with shared `api` utility.
- Updated submissions to:
  - `POST /events`
  - `POST /themes`
- Removed manual token/header duplication handled by `api` interceptors.

---

## 15. EventDetails Build Break (Duplicate Variable)

**File:** `frontend/src/pages/OrganizerDashboard/EventDetails.jsx`  
**Problem:** Duplicate declaration of `bannerSrc` caused build failure (`The symbol "bannerSrc" has already been declared`).  
**Fix:** Removed invalid duplicate declaration and kept a single valid `bannerSrc` assignment using theme image bytes fallback.

---

## 16. Event Submit Blocked by Missing Venue Issuer

**Files:**
- `backend/src/services/booking.service.js`
- `backend/src/services/purchase.service.js`

**Problem:** Event/purchase flows failed with: `No Venue Issuer configured in system. Cannot create invoice.` when no issuer existed in DB.  
**Fix:** Added fallback helper to auto-create a default `VenueIssuer` when none exists, allowing invoice creation and submission to proceed.

---

## 17. Admin Event Details Load Failure

**File:** `frontend/src/pages/AdminDashboard/AdminEventDetails.jsx`  
**Problem:** `Failed to load event or related details.` due to hardcoded non-versioned endpoints and brittle response handling.  
**Fix:**
- Replaced hardcoded URLs with shared `api` client (`/api/v1` aware).
- Updated event, approvals, bookings, documents, status updates, and download calls.
- Added safer payload parsing (`data.data` vs `data`) and non-fatal handling for optional related fetches.

---

## 18. Email Verification Link Could Not Be Completed

**Files:** `frontend/src/App.jsx`, `frontend/src/pages/Auth/VerifyEmail.jsx` (new)
**Problem:** Verification emails linked users to `/auth/verify-email?token=...`, but the frontend had no matching route/page. Users landed on 404 and remained unverified, causing protected API calls to fail with “Please verify your email address to proceed.”
**Fix:**
- Added a new auth page `VerifyEmail.jsx` that reads the `token` query param and calls `POST /auth/verify-email`.
- Added the missing route in `App.jsx`: `/auth/verify-email`.
- Added clear success/error feedback and a login action after verification.

---

## Root Cause Summary

Nearly all 404 errors shared the same root cause: frontend files were making API calls to `http://localhost:3000/<path>` directly, but the backend mounts all routes under the `/api/v1` prefix (configured via `API_PREFIX=/api/v1` in `.env`). The shared `api` utility at `frontend/src/utils/api.js` already had the correct `baseURL` configured — the fix was to use it consistently across all files.
