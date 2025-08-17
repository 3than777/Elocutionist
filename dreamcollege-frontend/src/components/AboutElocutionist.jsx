import React from 'react';

const AboutElocutionist = () => {

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background-primary)',
      color: 'var(--text-primary)',
      transition: 'all 0.3s ease'
    }}>
      {/* About Us Section */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '60px'
      }}>
        {/* Left side - Image */}
        <div style={{
          flex: '1',
          position: 'relative'
        }}>
          {/* Placeholder image container */}
          <div style={{
            width: '100%',
            height: '500px',
            backgroundColor: 'var(--background-secondary)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative element mimicking the gold frame in reference */}
            <div style={{
              position: 'absolute',
              bottom: '40px',
              right: '40px',
              width: '150px',
              height: '150px',
              border: '3px solid var(--accent-primary)',
              borderRadius: '8px',
              transform: 'rotate(5deg)'
            }} />
            
            {/* Person silhouette placeholder */}
            <svg width="200" height="300" viewBox="0 0 200 300" fill="var(--text-tertiary)">
              <circle cx="100" cy="80" r="40"/>
              <path d="M 60 120 Q 100 100 140 120 L 140 250 Q 100 270 60 250 Z"/>
            </svg>
            
            {/* Decorative items on desk */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              display: 'flex',
              gap: '10px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'var(--text-quaternary)',
                borderRadius: '50%'
              }} />
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'var(--text-quaternary)',
                borderRadius: '50%'
              }} />
            </div>
          </div>
        </div>

        {/* Right side - Content */}
        <div style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          gap: '30px'
        }}>
          {/* Logo and Title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '30px'
          }}>
            {/* Logo placeholder */}
            <div style={{
              width: '60px',
              height: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                <circle cx="30" cy="30" r="30" fill="var(--background-tertiary)"/>
                <g transform="translate(30, 30)">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <rect
                      key={i}
                      x="-2"
                      y="-20"
                      width="4"
                      height="8"
                      fill="var(--text-primary)"
                      transform={`rotate(${i * 22.5})`}
                    />
                  ))}
                </g>
              </svg>
            </div>
            
            <h1 style={{
              fontSize: '48px',
              fontWeight: '700',
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              ABOUT US
            </h1>
          </div>

          {/* Description paragraphs */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            fontSize: '16px',
            lineHeight: '1.6',
            color: 'var(--text-secondary)'
          }}>
            <p style={{ margin: 0 }}>
              Elocutionist started as a small AI-powered coaching platform in San Francisco, 
              aiming to help job seekers master interview skills with cutting-edge technology. 
              It soon became obvious that traditional mock interviews weren't enough to help 
              candidates truly excel, and so we built an AI that adapts to each user's needs 
              and provides personalized feedback in real-time.
            </p>
            
            <p style={{ margin: 0 }}>
              Currently, we offer AI-powered interview coaching, real-time feedback analysis, 
              and comprehensive performance tracking to help our users build confidence and 
              land their dream jobs. We value our users above everything else, meaning that 
              we won't take "OK" as an answer when it comes to interview preparation.
            </p>
          </div>

          {/* Social Media Icons */}
          <div style={{
            display: 'flex',
            gap: '20px',
            marginTop: '10px'
          }}>
            {/* Twitter/X */}
            <a 
              href="#" 
              style={{
                color: 'var(--text-tertiary)',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--accent-primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-tertiary)'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            
            {/* Facebook */}
            <a 
              href="#" 
              style={{
                color: 'var(--text-tertiary)',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--accent-primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-tertiary)'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            
            {/* Instagram */}
            <a 
              href="#" 
              style={{
                color: 'var(--text-tertiary)',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => e.target.style.color = 'var(--accent-primary)'}
              onMouseLeave={(e) => e.target.style.color = 'var(--text-tertiary)'}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutElocutionist;