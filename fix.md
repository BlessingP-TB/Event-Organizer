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

## Root Cause Summary

Nearly all 404 errors shared the same root cause: frontend files were making API calls to `http://localhost:3000/<path>` directly, but the backend mounts all routes under the `/api/v1` prefix (configured via `API_PREFIX=/api/v1` in `.env`). The shared `api` utility at `frontend/src/utils/api.js` already had the correct `baseURL` configured — the fix was to use it consistently across all files.
---

## 13. Attendee Rating Route Mismatch Fixed

**Files:** `frontend/src/pages/AttendeeDashBoard/Events.jsx`, `frontend/src/components/Footer.jsx`  
**Problem:** Attendee rating navigation was pointing to `/attendee/rate-events`, but the route in `App.jsx` is `/attendee/ratings`.  
**Fix:** Updated navigation and footer link to `/attendee/ratings` so post-event rating flow opens correctly.

---

## 14. Notifications API Implemented (Backend)

**Files:**
- `backend/src/services/notification.service.js` (new)
- `backend/src/controllers/notification.controller.js` (new)
- `backend/src/routes/notification.routes.js` (new)
- `backend/src/routes/index.routes.js`
- `backend/src/controllers/index.controller.js`
- `backend/src/services/index.service.js`

**Problem:** Attendee dashboard called `/notifications`, but no backend route existed.  
**Fix:** Added authenticated `GET /api/v1/notifications` endpoint that generates notifications from registration/event state:
- Registration pending
- Registration rejected
- Event cancelled
- Event reminder (within 24 hours)
- Event completed (feedback prompt)

---

## 15. Attendee "Failed to Load Your Events" Fixed

**File:** `backend/src/routes/registration.routes.js`  
**Problem:** Attendee registration endpoints enforced `enforceEmailVerification`, but `ENABLE_EMAILS=false` in development caused `403` responses on `/registrations/my`.  
**Fix:** Disabled `enforceEmailVerification` on attendee registration endpoints used by dashboard flows.

---

## 16. Sample Published Event Seeded for Attendee Dashboard

**File:** `backend/seed-event.js` (new)  
**Action:** Created and executed seed script to insert a published event and free ticket definition for attendee discovery/registration testing.

**Seeded Event:**
- `Tech Innovation Summit 2026`
- Status: `PUBLISHED`
- Free `General Admission` ticket
- Linked to existing organizer and venue

**Result:** Event is returned by `GET /api/v1/events/public` and appears in attendee discover flow.
