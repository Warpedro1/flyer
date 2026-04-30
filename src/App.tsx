import { Navigate, Route, Routes } from 'react-router-dom';

import AppLayout from './components/layout/AppLayout.tsx';
import ChatPage from './pages/ChatPage.tsx';
import CheckInPage from './pages/CheckInPage.tsx';
import CreateEventPage from './pages/CreateEventPage.tsx';
import DiscoverPage from './pages/DiscoverPage.tsx';
import EventDetailsPage from './pages/EventDetailsPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import MapPage from './pages/MapPage.tsx';
import MyEventsPage from './pages/MyEventsPage.tsx';
import NotificationsPage from './pages/NotificationsPage.tsx';
import PlansPage from './pages/PlansPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/events" element={<MyEventsPage />} />
        <Route path="/events/new" element={<CreateEventPage />} />
        <Route path="/events/:id" element={<EventDetailsPage />} />
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
