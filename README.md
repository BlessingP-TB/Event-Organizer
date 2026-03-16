# SmartEvents

A full-stack event management platform for organizing, booking, and attending campus events — featuring role-based dashboards, ticketing, venue management, approval workflows, notifications, and analytics.

## Tech Stack

| Layer        | Technology                           |
|-------------|--------------------------------------|
| **Backend**  | Node.js, Express 5, Prisma ORM      |
| **Frontend** | React 19, Vite, React Router 7      |
| **Mobile**   | Expo SDK 54, React Native 0.81      |
| **Database** | MySQL 8                              |
| **Auth**     | JWT (access + refresh tokens), bcrypt|

## Project Structure

```
smartevents/
├── backend/
│   ├── prisma/              # Prisma schema & generated client
│   ├── database/            # Raw SQL schema
│   ├── src/
│   │   ├── configs/         # App, auth, CORS, rate-limit, multer configs
│   │   ├── constants/       # Enums (roles, statuses, HTTP codes)
│   │   ├── controllers/     # Route handlers
│   │   ├── middlewares/     # Auth, validation, authorization, error handling
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Business logic layer
│   │   ├── utils/           # Helpers (email, tokens, PDF, pagination)
│   │   └── validations/     # Joi request schemas
│   └── server.js
├── frontend/
│   └── src/
│       ├── components/      # Reusable UI (sidebar, cards, modals)
│       ├── constants/       # Sidebar links, config
│       ├── hooks/           # Custom hooks (admin dashboard, users)
│       ├── layouts/         # Role-based layouts (Admin, Organizer, Attendee)
│       ├── pages/           # Route pages by role
│       ├── styles/          # SCSS modules
│       └── utils/           # API client, helpers
├── mobile/
│   └── app/
│       ├── (tabs)/          # Tab-based navigation
│       ├── data/            # API data layer
│       └── hooks/           # Mobile hooks
└── README.md
```

## User Roles

| Role          | Capabilities                                                                       |
|--------------|-------------------------------------------------------------------------------------|
| **Admin**     | Manage users, approve/reject events, manage venues & tools, view analytics/reports  |
| **Organizer** | Create events, select venues & themes, manage tickets, view event status & bookings |
| **Attendee**  | Discover events, register, view tickets & QR codes, rate events, submit support     |

## Core Features

### Event Lifecycle
- Organizers create events → status starts as **DRAFT** with a **PENDING** approval
- Admins approve or reject → event becomes **PUBLISHED** or **CANCELLED**
- Published events are visible to attendees for registration
- Events progress through: `DRAFT → PENDING → PUBLISHED → ONGOING → COMPLETED`

### Notifications
- Real-time database-backed notifications for all roles
- Organizers notified when events are submitted, approved, or rejected
- Admins notified when new event requests are submitted
- Sidebar badge shows unread count

### Ticketing & Registration
- Supports free and paid events with custom ticket definitions
- Auto-distributes tickets on registration approval
- QR code generation for check-in
- Capacity enforcement per ticket type

### Venue Management
- Venues with capacity, pricing, rate types, and image galleries
- Booking system with cooling break periods between events
- Conflict detection prevents double-booking
- Calendar-based availability

### Approvals
- Multi-type approval system (events, documents, liquor requests)
- Status cascading: approval status drives event status
- Admin can approve, reject, or override with notes

### Analytics & Reports
- Attendee stats: registrations, upcoming events, spending, attendance history
- Admin analytics with export functionality
- Organizer dashboard with event metrics

## Getting Started

### Prerequisites

- **Node.js** v18+
- **MySQL** 8.0+
- **npm** (bundled with Node.js)
- **Expo CLI** (`npm install -g expo-cli`) — for mobile only

### 1. Clone the Repository

```bash
git clone https://github.com/iceptutemalahleni/smartevents.git
cd smartevents
```

### 2. Set Up the Database

1. Open MySQL Workbench and connect to your local MySQL server
2. Run the SQL script at `backend/database/schema.sql` to create the `event_handler_db` database

### 3. Backend Setup

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your MySQL credentials:

```dotenv
DB_USER=root
DB_PASS=your_password
DB_NAME=event_handler_db
DB_SERVER=localhost
DB_PORT=3306
```

Install and start:

```bash
npm install
npm run prepare-db-url       # Generates DATABASE_URL from DB_* vars
npx prisma generate          # Generate Prisma client
npm run dev                  # Start on http://localhost:3000
```

Set up the initial admin account:

```bash
npm run admin:setup
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev                  # Start on http://localhost:5173
```

### 5. Mobile Setup

```bash
cd mobile
npm install
npx expo start               # Opens Expo dev tools
```

## API Endpoints

All routes are under `http://localhost:3000/api/v1`:

| Route                  | Description                             |
|-----------------------|-----------------------------------------|
| `/auth`               | Register, login, logout, refresh tokens  |
| `/admin`              | User & system management, calendars      |
| `/events`             | Event CRUD, public listing, publishing   |
| `/venues`             | Venue CRUD with availability             |
| `/bookings`           | Venue bookings & deposit tracking        |
| `/registrations`      | Event registration & approval            |
| `/tickets`            | Ticket retrieval & ownership             |
| `/ticket-definitions` | Manage ticket types per event            |
| `/purchases`          | Payment processing                       |
| `/invoices`           | Invoice generation & management          |
| `/documents`          | File uploads & admin review              |
| `/approvals`          | Admin approval workflows                 |
| `/notifications`      | CRUD notifications, mark read, clear     |
| `/ratings`            | Event ratings by attendees               |
| `/support`            | Attendee support requests                |
| `/liquor-requests`    | Liquor license requests                  |
| `/reports`            | Event reporting & analytics              |
| `/organizer`          | Organizer profile management             |
| `/attendee`           | Attendee dashboard stats                 |
| `/themes`             | Event themes & images                    |
| `/tools`              | Venue equipment & tools                  |

### Event Cancellation & Reschedule Workflow

- `POST /events/:eventId/cancel` (Organizer): Cancel an approved event and provide a required cancellation reason.
- `POST /events/:eventId/reschedule-request` (Organizer): Submit a new date/time (and optional venue change) with reason.
- `PATCH /admin/approvals/:approval_id` (Admin): Approve or reject organizer reschedule requests.
- On reschedule approval, admin flow validates venue availability before updating event schedule.

## Database Schema

The app uses **22+ tables** managed by Prisma ORM:

| Table                | Description                                        |
|---------------------|----------------------------------------------------|
| `User`              | All users (Admin, Organizer, Attendee)              |
| `Account`           | Auth credentials & login state                      |
| `Session`           | Active user sessions                                |
| `AuthToken`         | Refresh, reset-password & verification tokens       |
| `OrganizerProfile`  | Organizer verification details                      |
| `Venue`             | Event venues with capacity, pricing, images         |
| `Theme`             | Event themes with optional images                   |
| `Event`             | Core event data (dates, status, ticketing config)   |
| `TicketDefinition`  | Ticket types per event (name, price, quantity)      |
| `Ticket`            | Issued tickets with QR codes                        |
| `Registration`      | User-to-event registrations                         |
| `Attendance`        | Check-in/check-out tracking                         |
| `Purchase`          | Payment transactions for tickets                    |
| `Booking`           | Venue bookings with deposit & payment tracking      |
| `Invoice`           | Invoices linked to purchases or bookings            |
| `VenueIssuer`       | Institution details for invoice issuance            |
| `Document`          | Uploaded files (IDs, certificates, invoices)        |
| `LiquorRequest`     | Liquor license requests per event                   |
| `Approval`          | Admin approvals (events, safety, liquor, docs)      |
| `Report`            | Event reports                                       |
| `Tool`              | Equipment/tools available at venues                 |
| `SystemSetting`     | Key-value app configuration                         |
| `Calendar`          | Venue availability calendar entries                 |
| `Notification`      | User notifications (created dynamically)            |
| `Rating`            | Event ratings by attendees (created dynamically)    |

## Environment Variables

See [`backend/.env.example`](backend/.env.example) for all configuration options:

- **Database**: `DB_USER`, `DB_PASS`, `DB_NAME`, `DB_SERVER`, `DB_PORT`
- **Auth**: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_EXPIRY`, `REFRESH_TOKEN_EXPIRY`
- **CORS**: `CORS_ORIGINS`
- **Email**: SMTP settings for transactional emails
- **Payments**: Paystack gateway keys
- **File Storage**: Upload limits & storage strategy (DB or Blob)
- **Rate Limiting**: Request throttling configuration
- **Admin**: Encryption keys for admin setup

## Scripts

| Command                   | Location  | Description                          |
|--------------------------|----------|--------------------------------------|
| `npm run dev`            | backend  | Start with nodemon (hot reload)       |
| `npm start`              | backend  | Start the production server           |
| `npm run prepare-db-url` | backend  | Generate DATABASE_URL from DB_* vars  |
| `npm run migrate`        | backend  | Run Prisma migrations                 |
| `npm run admin:setup`    | backend  | Set up initial admin user             |
| `npm run dev`            | frontend | Start Vite dev server                 |
| `npm run build`          | frontend | Build for production                  |
| `npm run lint`           | frontend | Run ESLint                            |
| `npx expo start`         | mobile   | Start Expo dev server                 |

## Frontend Pages

### Admin Dashboard
- **Overview** — System-wide stats and metrics
- **User Management** — CRUD users, role assignment
- **Event Approvals** — Approve/reject pending events
- **Venue Management** — CRUD venues with images
- **Analytics Export** — Export reports as PDF

### Organizer Dashboard
- **Dashboard** — Event stats and overview
- **Create Event** — Multi-step form with venue selection, theme, tickets
- **My Events** — List and manage created events
- **Event Details** — View status, bookings, modify, upload payment proof
- **Discover Events** — Browse all public events

### Attendee Dashboard
- **Dashboard** — Ticket count, upcoming events, spending summary
- **Discover Events** — Browse and search public events with filters
- **My Events** — View registered events (Upcoming, Ongoing, Attended, Missed)
- **Register for Event** — Registration form with terms acceptance
- **Event Details** — Full event information view
- **QR Code Check-in** — Ticket QR code display
- **Rate Event** — Star rating with categories after attendance
- **Help & Support** — Submit support requests

## License

[ISC](LICENSE)
