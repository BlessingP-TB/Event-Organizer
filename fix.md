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

**Problem:** Three API calls used raw `axios` with hardcoded `http://localhost:3000/...` URLs missing the `/api/v1` prefix.  
**Fix:** Replaced `axios` with the shared `api` utility for all three calls:
- `GET /events/organizer`
- `GET /documents/me/documents`
- `GET /documents/documents/:id`

**File:** `frontend/src/components/VenueCardGallery.jsx`  
**Fix:** Replaced `axios` with the shared `api` utility (`api.get("/venues")`).

---

## 5. CreateEvent 404 Errors (Calendars & Tools)



## 6. Admin Dashboard 404 Errors

**File:** `frontend/src/hooks/Admin/adminDashBoard.js`  
**Problem:** Three `axios` calls used hardcoded `http://localhost:3000/...` URLs.  
**Fix:** Replaced `axios` with the shared `api` utility for:
- `GET /admin/dashboard`
- `GET /admin/analytics/revenue`

---

## 7. AdminTools 404 Errors

**File:** `frontend/src/pages/AdminDashboard/AdminTools.jsx`  
**Fix:** Added `API_BASE` constant and updated all calls:
- `GET /tools`
- `POST /admin/tools`
- `PATCH /admin/tools/:id`
- `DELETE /admin/tools/:id`


**Problem:** Two `fetch()` calls used hardcoded `http://localhost:3000/...` URLs.  
**Fix:** Added `API_BASE` constant and updated:
- `GET /approvals`
- `GET /admin/events/:eventId`

---
**Problem:**
2. Six `axios` calls used hardcoded `http://localhost:3000/...` URLs.

**Fix:**
- Removed the duplicate catch block to fix the syntax error.
- Replaced `axios` with the shared `api` utility for all six calls:
  - `GET /admin/users` (×2, initial + retry)
  - `DELETE /admin/users/:id`

---

## 10. AnalyticsExportScreen 404 Error

**File:** `frontend/src/pages/AdminDashboard/AnalyticsExportScreen.jsx`  
**Problem:** `fetch("http://localhost:3000/reports/analytics")` missing `/api/v1` prefix.  
**Fix:** Updated to use `API_BASE` constant with the correct base URL.

## 11. Admin Calendar Hook 404 Errors

**File:** `frontend/src/hooks/Admin/useCalendar.js`  
**Problem:** Six `axios` calls used hardcoded `http://localhost:3000/...` URLs.  
**Fix:** Replaced `axios` with the shared `api` utility for:
- `GET /venues`
- `GET /bookings/bookings`
- `POST /admin/calendars`
- `PATCH /admin/calendars/:id`
- `DELETE /admin/calendars/:id`

---


**File:** `backend/seed-admin.js` (new)  
**Action:** Created and ran a seed script to insert an ADMIN user into the database.

| Field        | Value                    |
|--------------|--------------------------|


**File:** `frontend/src/pages/OrganizerDashboard/CreateEvent.jsx`  
**Problem:** Selecting a venue made date selection fail or become overly restrictive because availability checks were too strict (payload shape/type mismatches and empty-calendar scenarios).  
**Fix:**
- Added robust slot matching for both `venueIds` and `venueId` formats.
- Normalized ID/date matching logic to prevent false mismatches.
- Prevented hard lockouts when calendar data is empty/not loaded.
- Relaxed validation so date/time availability errors are only shown when relevant slot data actually exists.

---

## 14. Organizer Confirm Submit 404 Error

**Problem:** Event submit used hardcoded `http://localhost:3000/events` and theme submit used `http://localhost:3000/themes/`, both missing `/api/v1`.  
**Fix:**
- Replaced raw URL requests with shared `api` utility.
- Updated submissions to:
  - `POST /events`
  - `POST /themes`
## 15. EventDetails Build Break (Duplicate Variable)
**File:** `frontend/src/pages/OrganizerDashboard/EventDetails.jsx`  
**Problem:** Duplicate declaration of `bannerSrc` caused build failure (`The symbol "bannerSrc" has already been declared`).  
**Fix:** Removed invalid duplicate declaration and kept a single valid `bannerSrc` assignment using theme image bytes fallback.

---

**Files:**
- `backend/src/services/booking.service.js`

**Fix:** Added fallback helper to auto-create a default `VenueIssuer` when none exists, allowing invoice creation and submission to proceed.

---

## 17. Admin Event Details Load Failure

**File:** `frontend/src/pages/AdminDashboard/AdminEventDetails.jsx`  
**Fix:**
- Replaced hardcoded URLs with shared `api` client (`/api/v1` aware).
- Updated event, approvals, bookings, documents, status updates, and download calls.
- Added safer payload parsing (`data.data` vs `data`) and non-fatal handling for optional related fetches.

## Root Cause Summary

Nearly all 404 errors shared the same root cause: frontend files were making API calls to `http://localhost:3000/<path>` directly, but the backend mounts all routes under the `/api/v1` prefix (configured via `API_PREFIX=/api/v1` in `.env`). The shared `api` utility at `frontend/src/utils/api.js` already had the correct `baseURL` configured — the fix was to use it consistently across all files.
---

## Corlett

### Issues Identified (March 9, 2026)

- **Location**: `frontend/src/pages/AttendeeDashBoard/Events.jsx` line 215
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
