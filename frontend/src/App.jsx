// src/App.jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthLayout from './layouts/AuthLayout';
import ProtectedRoute from './pages/Auth/ProtectedRoute';
import Unauthorized from './pages/Auth/Unauthorized';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './App.scss';
import './styles/abstracts/profile.scss';

/* ---------- Lazy Layouts ---------- */
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AttendeeLayout = lazy(() => import('./layouts/AttendeeLayout'));
const OrganizerLayout = lazy(() => import('./layouts/OrganizerLayout'));

/* ---------- Organizer Pages ---------- */
const Dashboard = lazy(() => import('./pages/OrganizerDashboard/OrganizerDashboard'));
const MyEvents = lazy(() => import('./pages/OrganizerDashboard/MyEvents'));
// const Discover = lazy(() => import('./components/organizer_discover/discover'));
const CreateEvent = lazy(() => import('./pages/OrganizerDashboard/CreateEvent'));
const ConfirmEventDetails = lazy(() => import('./pages/OrganizerDashboard/ConfirmEventDetails'));
const OrganizerEventRating = lazy(() => import('./pages/OrganizerDashboard/EventRating'));
const EventDetails = lazy(() => import('./pages/OrganizerDashboard/EventDetails'));
const ModifyForm = lazy(() => import('./pages/OrganizerDashboard/ModifyForm'));
const EventDetailsModify = lazy(() => import('./pages/OrganizerDashboard/EventDetailsModify'));
const ConfirmModifiedDetails = lazy(() => import('./pages/OrganizerDashboard/ConfirmModifiedDetails'));
const RegisterForEvent = lazy(() => import('./pages/OrganizerDashboard/RegisterForEvent'));
const UploadProofOfPayment = lazy(() => import('./pages/OrganizerDashboard/UploadProofOfPayment'));
/* ---------- Admin Pages ---------- */
const AnalyticsDashboard = lazy(() => import("./pages/AdminDashboard/AnalyticsDashboard"));
const AnalyticsExportScreen = lazy(() => import("./pages/AdminDashboard/AnalyticsExportScreen"));
const ApprovalScreen = lazy(() => import("./pages/AdminDashboard/ApprovalScreen"));
const AdminEventDetails = lazy(() => import("./pages/AdminDashboard/AdminEventDetails"));
const AdminChat = lazy(() => import("./pages/AdminDashboard/AdminChat"));
const AvailableVenues = lazy(() => import("./pages/AdminDashboard/AvailableVenues"));
const AdminCalendar = lazy(() => import("./pages/AdminDashboard/AdminCalendar"));
const UserManagement = lazy(() => import("./pages/AdminDashboard/UserManagement"));
const AdminTools = lazy(() => import("./pages/AdminDashboard/AdminTools"));
const AdminEvents = lazy(() => import("./pages/AdminDashboard/AdminEvents"));

/* ---------- Attendee Pages ---------- */
const Events = lazy(() => import('./pages/AttendeeDashBoard/Events'));
const AttendeeEventRating = lazy(() => import('./pages/AttendeeDashBoard/EventRating'));
const CheckInScreen = lazy(() => import('./pages/AttendeeDashBoard/CheckInScreen'));
const AttendeeRegisterForEvent = lazy(() => import('./pages/AttendeeDashBoard/RegisterForEvent'));
const ViewEventDetails = lazy(() => import('./pages/AttendeeDashBoard/ViewEventDetails'));

/* ---------- Auth Pages ---------- */
const HomePage = lazy(() => import('./pages/Auth/HomePage'));
const Login = lazy(() => import('./pages/Auth/Login'));
const Register = lazy(() => import('./pages/Auth/Register'));
const ForgotPassword = lazy(() => import('./pages/Auth/ForgotPassword'));
const ResetPasswordForm = lazy(() => import('./pages/Auth/ResetPasswordForm'));

/* ---------- Shared Pages ---------- */
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const Discover = lazy(() => import('./pages/AttendeeDashBoard/Discover'));

/* ---------- Utility Components ---------- */
function LoadingFallback() {
  return (
    <div className="loading-container">
      <i className="fas fa-spinner fa-spin"></i>
      <p>Loading...</p>
    </div>
  );
}

function NotFound() {
  return <h2 className="text-center mt-5">404 - Page Not Found</h2>;
}

/* ---------- Main App ---------- */
function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>

          {/* ---------- Auth Routes ---------- */}
          <Route path="/" element={<AuthLayout><HomePage /></AuthLayout>} />
          <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
          <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
          <Route path="/forgot-password" element={<AuthLayout><ForgotPassword /></AuthLayout>} />
          <Route path="/reset-password" element={<AuthLayout><ResetPasswordForm /></AuthLayout>} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ---------- Organizer Routes ---------- */}
          <Route
            path="/organizer/*"
            element={
              <ProtectedRoute allowedRoles={['ORGANIZER']}>
                <OrganizerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="discover" element={<Discover />} />
            <Route path="events" element={<MyEvents />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="upload-pop/:id" element={<UploadProofOfPayment />} />
            <Route path="create-event" element={<CreateEvent />} />
            <Route path="confirm-event" element={<ConfirmEventDetails />} />
            <Route path="ratings" element={<OrganizerEventRating />}/>
            <Route path="event/:id" element={<EventDetails />} />
            <Route path="modify-event/:id" element={<ModifyForm />} />
            <Route path="event-details-modify/:id" element={<EventDetailsModify />} />
            <Route path="confirm-modified-details" element={<ConfirmModifiedDetails />} />
            <Route path="view-event/:id" element={<ViewEventDetails />} />

          </Route>

          {/* ---------- Admin Routes ---------- */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AnalyticsDashboard />} />
            <Route path="export" element={<AnalyticsExportScreen />} />
            <Route path="approvals" element={<ApprovalScreen />} />
            <Route path="details/:id" element={<AdminEventDetails />} />
            <Route path="venue-management" element={<AvailableVenues />} />
            <Route path="calendar" element={<AdminCalendar />} />
            <Route path="user-management" element={<UserManagement />} />
            <Route path="tools" element={<AdminTools />} />
            <Route path="chat" element={<AdminChat />} />
            <Route path="profile" element={<ProfilePage />} />
           <Route path="events" element={<AdminEvents />} />
          {/* <Route path="events/:id" element={<AdminEventDetails />} />  */}

          </Route>

          {/* ---------- Attendee Routes ---------- */}
          <Route
            path="/attendee/*"
            element={
              <ProtectedRoute allowedRoles={['ATTENDEE']}>
                <AttendeeLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Discover/>} />
            {/* <Route path="dashboard" element={<Events />} /> */}
            <Route path="qr-code" element={<CheckInScreen />} />
            <Route path="view-event/:id" element={<ViewEventDetails />} />
            <Route path="my-events" element={<Events  />} />
            <Route path="register/:id" element={<AttendeeRegisterForEvent />} />
            <Route path="ratings" element={<AttendeeEventRating />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* ---------- 404 ---------- */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

