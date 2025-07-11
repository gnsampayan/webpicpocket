import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import Pockets from './components/Pockets';
import Contacts from './components/Contacts';
import Settings from './components/Settings';
import EventView from './components/EventView';
import GridPhotoView from './components/GridPhotoView';
import ProtectedRoute from './components/ProtectedRoute';
import { EmailVerificationProvider } from './context/EmailVerificationContext';
import GlobalEmailVerificationModal from './components/GlobalEmailVerificationModal';
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
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          </Routes>
          <GlobalEmailVerificationModal />
        </div>
      </Router>
    </EmailVerificationProvider>
  );
}

export default App;
