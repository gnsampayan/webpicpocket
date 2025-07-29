import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import LandingPage from './components/pages/LandingPage';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Pockets from './components/pages/Pockets';
import Contacts from './components/pages/Contacts';
import Settings from './components/pages/Settings';
import EventView from './components/views/EventView';
import GridPhotoView from './components/views/GridPhotoView';
import ProfileView from './components/views/ProfileView';
import ProtectedRoute from './components/ProtectedRoute';
import { EmailVerificationProvider } from './context/EmailVerificationContext';
import { ThemeProvider } from './context/ThemeContext';
import GlobalEmailVerificationModal from './components/modals/GlobalEmailVerificationModal';
import PhotoDetailsView from './components/views/PhotoDetailsView';
import './App.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <EmailVerificationProvider>
          <Router>
            <div className="App">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                <Route path="/profile/:userId" element={<ProfileView />} />
                <Route path="/pockets" element={<ProtectedRoute><Pockets /></ProtectedRoute>} />
                <Route path="/pockets/:pocketTitle" element={<ProtectedRoute><EventView /></ProtectedRoute>} />
                <Route path="/pockets/:pocketTitle/:eventTitle" element={<ProtectedRoute><GridPhotoView /></ProtectedRoute>} />
                <Route path="/pockets/:pocketTitle/:eventTitle/photo/:photoShortId" element={<ProtectedRoute><PhotoDetailsView /></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              </Routes>
              <GlobalEmailVerificationModal />
            </div>
          </Router>
        </EmailVerificationProvider>
        {/* <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" /> */}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
