import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/pages/LandingPage';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Dashboard from './components/pages/Dashboard';
import Pockets from './components/pages/Pockets';
import Contacts from './components/pages/Contacts';
import Settings from './components/pages/Settings';
import EventView from './components/views/EventView';
import GridPhotoView from './components/views/GridPhotoView';
import ProfileView from './components/views/ProfileView';
import ProtectedRoute from './components/ProtectedRoute';
import { EmailVerificationProvider } from './context/EmailVerificationContext';
import GlobalEmailVerificationModal from './components/modals/GlobalEmailVerificationModal';
import './App.css';

function App() {
  return (
    <EmailVerificationProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pockets" element={<ProtectedRoute><Pockets /></ProtectedRoute>} />
            <Route path="/pockets/:pocketId" element={<ProtectedRoute><EventView /></ProtectedRoute>} />
            <Route path="/pockets/:pocketId/:eventId" element={<ProtectedRoute><GridPhotoView /></ProtectedRoute>} />
            <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
            <Route path="/contacts/:username" element={<ProtectedRoute><ProfileView /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
          <GlobalEmailVerificationModal />
        </div>
      </Router>
    </EmailVerificationProvider>
  );
}

export default App;
