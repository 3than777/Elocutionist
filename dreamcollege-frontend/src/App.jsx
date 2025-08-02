import React, { useState, useEffect } from 'react';
import ChatBox from './components/ChatBox';
import SettingsPanel from './components/SettingsPanel';
import AuthModal from './components/AuthModal';
import { UploadProvider } from './context/UploadContext';
import './index.css';     // we'll put our grid styles here

export default function App() {
  const [difficulty, setDifficulty] = useState(null);
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // AI Rating state management - shared between ChatBox and SettingsPanel
  const [aiRating, setAiRating] = useState(null);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState(null);

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
  };

  // Function to retry AI rating generation
  const retryRating = () => {
    setRatingError(null);
    setRatingLoading(true);
    // Note: The actual retry will need to be triggered from ChatBox
    // since it has access to the transcript ID and API functions
    console.log('Retry rating requested - this will be handled by ChatBox component');
  };

  return (
    <UploadProvider user={user}>
      <div className="app-grid">
        {/* Authentication bar */}
        <div style={{
          gridColumn: '1 / -1',
          padding: '2px 16px',
          backgroundColor: '#f8f9fa',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '24px',
          fontSize: '12px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', lineHeight: '1' }}>
            AI Interview Coach
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {user ? (
              <>
                <span style={{ fontSize: '11px', color: '#666', lineHeight: '1' }}>
                  Welcome, {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  style={{
                    padding: '2px 8px',
                    fontSize: '10px',
                    border: '1px solid #ccc',
                    backgroundColor: '#fff',
                    borderRadius: '2px',
                    cursor: 'pointer',
                    lineHeight: '1',
                    height: '18px'
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  padding: '2px 10px',
                  fontSize: '11px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  lineHeight: '1',
                  height: '20px'
                }}
              >
                Login / Sign Up
              </button>
            )}
          </div>
        </div>

        <div className="chat-area">
          <ChatBox 
            difficulty={difficulty} 
            user={user}
            aiRating={aiRating}
            setAiRating={setAiRating}
            ratingLoading={ratingLoading}
            setRatingLoading={setRatingLoading}
            ratingError={ratingError}
            setRatingError={setRatingError}
          />
          {/* Show current settings for debugging */}
          {difficulty && (
            <div style={{ 
              fontSize: '12px', 
              color: '#666', 
              margin: '8px', 
              padding: '4px', 
              background: '#f5f5f5',
              borderRadius: '4px'
            }}>
              <div>Difficulty: {difficulty}</div>
            </div>
          )}
        </div>
        <div className="settings-area">
          <SettingsPanel 
            onDifficultyChange={setDifficulty}
            user={user}
            aiRating={aiRating}
            ratingLoading={ratingLoading}
            ratingError={ratingError}
            onRetryRating={retryRating}
          />
        </div>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </UploadProvider>
  );
}
