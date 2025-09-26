import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import ChatBox from './components/ChatBox';
import SettingsPanel from './components/SettingsPanel';
import AuthModal from './components/AuthModal';
import ProfileDropdown from './components/ProfileDropdown';
import HeaderDropdown from './components/HeaderDropdown';
import Dashboard from './components/Dashboard';
import AboutElocutionist from './components/AboutElocutionist';
import History from './components/History';
import MediaHub from './components/MediaHub';
import { UploadProvider } from './context/UploadContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { getAIRatingsHistory } from './services/api';
import './index.css';     // we'll put our grid styles here

const HeaderComponent = ({ user, onShowAuthModal, onLogout }) => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  return (
    <div style={{
      padding: '0 16px',
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'var(--background-primary)',
      backdropFilter: isDark ? 'blur(20px)' : 'none',
      WebkitBackdropFilter: isDark ? 'blur(20px)' : 'none',
      borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid var(--border-primary)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: '48px',
      fontSize: '14px',
      position: 'relative',
      zIndex: 5000
    }}>
      {/* Left - Logo */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center',
        minWidth: '160px'
      }}>
        <div style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace"
        }}
        onClick={() => navigate('/')}
        >
          Elocutionist
        </div>
      </div>

      {/* Center - Navigation Menu */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flex: 1,
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'var(--background-secondary)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}
          onClick={() => navigate('/')}
          >
            Practice
          </button>
          
          <HeaderDropdown 
            label="Analytics" 
            items={['Dashboard', 'History']} 
            onItemClick={(item) => {
              if (item === 'Dashboard') {
                navigate('/dashboard');
              } else if (item === 'History') {
                navigate('/history');
              }
            }}
          />
          
          <HeaderDropdown 
            label="Resources" 
            items={['About Elocutionist', 'Media Hub']} 
            onItemClick={(item) => {
              if (item === 'About Elocutionist') {
                navigate('/about-elocutionist');
              } else if (item === 'Media Hub') {
                navigate('/media-hub');
              }
            }}
          />
          
          <button style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            padding: '6px 10px',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = 'var(--background-secondary)';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'transparent';
          }}>
            Pricing
          </button>
        </div>
      </div>

      {/* Right - User section */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        position: 'relative',
        minWidth: '160px',
        justifyContent: 'flex-end'
      }}>
        {user ? (
          <ProfileDropdown user={user} onSignOut={onLogout} />
        ) : (
          <>
            <button
              onClick={onShowAuthModal}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                padding: '6px 10px',
                borderRadius: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--background-secondary)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              Sign in
            </button>
            <button
              onClick={onShowAuthModal}
              style={{
                padding: '6px 12px',
                fontSize: '14px',
                backgroundColor: 'var(--accent-blue)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                height: '32px'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--accent-blue-hover)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--accent-blue)';
              }}
            >
              Contact sales
            </button>
          </>
        )}
      </div>
    </div>
  );
};

function AppContent() {
  const [difficulty, setDifficulty] = useState(null);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // AI Rating state management - shared between ChatBox and SettingsPanel
  const [aiRating, setAiRating] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState(null);

  // Voice Tutorial state management - shared between ChatBox and SettingsPanel
  const [showVoiceTutorial, setShowVoiceTutorial] = useState(false);

  // Latest AI Rating from database for dashboard
  const [latestRatingFromDB, setLatestRatingFromDB] = useState(null);

  /**
   * Test the voice mode tutorial for debugging purposes
   * This function can be called multiple times to re-trigger the tutorial
   */
  const testVoiceTutorial = () => {
    console.log('=== TESTING VOICE TUTORIAL ===');
    console.log('Manually triggering voice tutorial for debugging');
    setShowVoiceTutorial(true);
  };

  // Check for existing authentication on app load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    console.log('[App] Checking auth - Token:', !!token, 'UserData:', !!userData);
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('[App] Parsed user:', parsedUser);
        setUser({ ...parsedUser, token }); // Include token in user object
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  // Fetch AI ratings history when user logs in
  useEffect(() => {
    const fetchLatestRating = async () => {
      if (user && user.token) {
        try {
          console.log('[App] Fetching AI ratings history for user');
          const response = await getAIRatingsHistory(user.token, 1, 0);
          
          if (response.data?.statistics?.latestRating) {
            console.log('[App] Latest rating found:', response.data.statistics.latestRating);
            setLatestRatingFromDB(response.data.statistics.latestRating.rating);
          } else {
            console.log('[App] No ratings found for user');
            setLatestRatingFromDB(null);
          }
        } catch (error) {
          console.error('[App] Error fetching ratings history:', error);
          // Don't show error to user, just continue without rating data
        }
      } else {
        setLatestRatingFromDB(null);
      }
    };

    fetchLatestRating();
  }, [user]);

  const handleAuthSuccess = (authData) => {
    console.log('[App] Auth success:', authData);
    setUser({ ...authData.user, token: authData.token });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    // Clear AI rating state on logout
    setAiRating(null);
    setRatingLoading(false);
    setRatingError(null);
    setLatestRatingFromDB(null);
  };

  // Function to retry AI rating generation
  const retryRating = () => {
    setRatingError(null);
    setRatingLoading(true);
    // Note: The actual retry will need to be triggered from ChatBox
    // since it has access to the transcript ID and API functions
    console.log('Retry rating requested - this will be handled by ChatBox component');
  };

  const { isDark } = useTheme();

  return (
    <UploadProvider user={user}>
      <Routes>
        <Route path="/" element={
          <div className="app-grid">
            <div style={{ gridColumn: '1 / -1' }}>
              <HeaderComponent 
                user={user} 
                onShowAuthModal={() => setShowAuthModal(true)} 
                onLogout={handleLogout} 
              />
            </div>
              <div className="practice-page-container" style={{
                gridColumn: '1 / -1',
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '20px',
                padding: '24px',
                background: isDark ? 'radial-gradient(ellipse at top left, rgba(147, 51, 234, 0.25) 0%, transparent 45%), radial-gradient(ellipse at bottom right, rgba(236, 72, 153, 0.25) 0%, transparent 45%), radial-gradient(ellipse at center right, rgba(59, 130, 246, 0.25) 0%, transparent 45%), #000000' : 'var(--background-primary)',
                minHeight: 'calc(100vh - 48px)'
              }}>
                <div className="chat-area-wrapper">
                  <ChatBox 
                    difficulty={difficulty} 
                    user={user}
                    aiRating={aiRating}
                    setAiRating={(rating) => {
                      setAiRating(rating);
                      // Also update the latest rating from DB when a new rating is generated
                      if (rating) {
                        setLatestRatingFromDB(rating);
                      }
                    }}
                    ratingLoading={ratingLoading}
                    setRatingLoading={setRatingLoading}
                    ratingError={ratingError}
                    setRatingError={setRatingError}
                    showVoiceTutorial={showVoiceTutorial}
                    setShowVoiceTutorial={setShowVoiceTutorial}
                  />
                </div>
                <div className="settings-area-wrapper" style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'white',
                  backdropFilter: isDark ? 'blur(20px)' : 'none',
                  WebkitBackdropFilter: isDark ? 'blur(20px)' : 'none',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: isDark ? '0 8px 32px 0 rgba(139, 92, 246, 0.05)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '2px solid #E5E7EB',
                  position: 'relative',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  maxHeight: 'calc(100vh - 112px)'
                }}>
                  <SettingsPanel 
                    onDifficultyChange={setDifficulty}
                    user={user}
                    aiRating={aiRating}
                    ratingLoading={ratingLoading}
                    ratingError={ratingError}
                    onRetryRating={retryRating}
                    testVoiceTutorial={testVoiceTutorial}
                  />
                </div>
              </div>
            </div>
          } />
          <Route path="/dashboard" element={
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <HeaderComponent 
                user={user} 
                onShowAuthModal={() => setShowAuthModal(true)} 
                onLogout={handleLogout} 
              />
              <Dashboard aiRating={aiRating || latestRatingFromDB} />
            </div>
          } />
          <Route path="/about-elocutionist" element={
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <HeaderComponent 
                user={user} 
                onShowAuthModal={() => setShowAuthModal(true)} 
                onLogout={handleLogout} 
              />
              <AboutElocutionist />
            </div>
          } />
          <Route path="/history" element={
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <HeaderComponent 
                user={user} 
                onShowAuthModal={() => setShowAuthModal(true)} 
                onLogout={handleLogout} 
              />
              <History />
            </div>
          } />
          <Route path="/media-hub" element={
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
              <HeaderComponent 
                user={user} 
                onShowAuthModal={() => setShowAuthModal(true)} 
                onLogout={handleLogout} 
              />
              <MediaHub />
            </div>
          } />
        </Routes>

        {/* Authentication Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </UploadProvider>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </Router>
  );
}
