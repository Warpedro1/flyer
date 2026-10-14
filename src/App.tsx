import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout.tsx';
import ChatPage from './pages/ChatPage.tsx';
import CheckInPage from './pages/CheckInPage.tsx';
import CompleteProfilePage from './pages/CompleteProfilePage.tsx';
import CreateEventPage from './pages/CreateEventPage.tsx';
import EditEventPage from './pages/EditEventPage.tsx';
import DiscoverPage from './pages/DiscoverPage.tsx';
import EventAttendeesPage from './pages/EventAttendeesPage.tsx';
import EventDetailsPage from './pages/EventDetailsPage.tsx';
import EmailCodePage from './pages/EmailCodePage.tsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import SignupCodePage from './pages/SignupCodePage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import MapPage from './pages/MapPage.tsx';
import MyEventsPage from './pages/MyEventsPage.tsx';
import MyTicketPage from './pages/MyTicketPage.tsx';
import NotificationsPage from './pages/NotificationsPage.tsx';
import PlansPage from './pages/PlansPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import ScanTicketPage from './pages/ScanTicketPage.tsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/code" element={<EmailCodePage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/signup/code" element={<SignupCodePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/complete-profile" element={<CompleteProfilePage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/events" element={<MyEventsPage />} />
        <Route path="/events/new" element={<CreateEventPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
        <Route path="/events/:id/edit" element={<EditEventPage />} />
        <Route path="/events/:id/ticket" element={<MyTicketPage />} />
        <Route path="/events/:id/attendees" element={<EventAttendeesPage />} />
        <Route path="/events/:id/scan" element={<ScanTicketPage />} />
        <Route path="/checkin" element={<CheckInPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
