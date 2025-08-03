/**
 * AI Rating Display Component - Apple Design Language
 * 
 * Apple-style AI interview feedback display featuring:
 * - Apple's San Francisco font family
 * - Rounded corners and soft shadows matching Apple's design
 * - Apple-style color palette and visual hierarchy
 * - SF Symbols-inspired iconography
 * - Apple's signature spacing and typography principles
 * - iOS/macOS-style card layouts and interactions
 * 
 * Updated to match Apple's design language from provided references
 */

import React, { useState, useCallback } from 'react';

const AIRatingDisplay = ({ 
  rating, 
  loading, 
  error, 
  onRetry 
}) => {
  // State for collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    strengths: true,
    weaknesses: true,
    recommendations: true,
    detailedScores: false // Start collapsed for less clutter
  });

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  // Enhanced loading state with skeleton
  if (loading) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background for loading effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
          animation: 'shimmer 2s infinite',
          pointerEvents: 'none'
        }}></div>
        
        <div style={{
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '20px',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid #007bff',
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            🤖 Analyzing your interview...
          </div>
          <div style={{
            fontSize: '14px',
            color: '#666',
            marginBottom: '15px'
          }}>
            This may take a few moments
          </div>
        </div>

        {/* Loading skeleton for rating structure */}
        <div style={{ marginBottom: '20px' }}>
          {/* Overall rating skeleton */}
          <div style={{
            height: '60px',
            backgroundColor: '#e9ecef',
            borderRadius: '8px',
            marginBottom: '15px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            <div style={{
              width: '80px',
              height: '20px',
              backgroundColor: '#dee2e6',
              borderRadius: '4px'
            }}></div>
          </div>

          {/* Section skeletons */}
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              marginBottom: '15px',
              padding: '15px',
              backgroundColor: '#e9ecef',
              borderRadius: '6px'
            }}>
              <div style={{
                width: '120px',
                height: '16px',
                backgroundColor: '#dee2e6',
                borderRadius: '4px',
                marginBottom: '10px'
              }}></div>
              <div style={{
                width: '100%',
                height: '12px',
                backgroundColor: '#dee2e6',
                borderRadius: '4px',
                marginBottom: '6px'
              }}></div>
              <div style={{
                width: '80%',
                height: '12px',
                backgroundColor: '#dee2e6',
                borderRadius: '4px'
              }}></div>
            </div>
          ))}
        </div>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }

  // Enhanced error state
  if (error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: '#f8d7da',
        borderRadius: '8px',
        border: '1px solid #f5c6cb',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '20px',
          color: '#721c24',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          ⚠️ Rating Generation Failed
        </div>
        <div style={{
          fontSize: '14px',
          color: '#721c24',
          marginBottom: '15px',
          lineHeight: '1.4'
        }}>
          {error}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'background-color 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: '0 auto'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
          >
            🔄 Try Again
          </button>
        )}
      </div>
    );
  }

  // No rating yet
  if (!rating) {
    return (
      <div style={{
        padding: '30px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '2px dashed #dee2e6',
        textAlign: 'center',
        color: '#6c757d'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '15px',
          opacity: 0.7
        }}>
          🎯
        </div>
        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          marginBottom: '8px',
          color: '#495057'
        }}>
          AI Rating Coming Soon
        </div>
        <div style={{
          fontSize: '14px',
          lineHeight: '1.4'
        }}>
          Complete an interview to receive personalized AI feedback with detailed analysis and recommendations
        </div>
      </div>
    );
  }

  // Helper function to render Apple-style star rating
  const renderStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <div key={i} style={{ 
          width: '16px',
          height: '16px',
          backgroundColor: '#FF9500',
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
          animation: `starPop 0.3s ease ${i * 0.1}s both`
        }}></div>
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <div key="half" style={{ 
          width: '16px',
          height: '16px',
          backgroundColor: '#FF9500',
          opacity: 0.5,
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
        }}></div>
      );
    }
    
    const emptyStars = 10 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <div key={`empty-${i}`} style={{ 
          width: '16px',
          height: '16px',
          backgroundColor: 'rgba(255,255,255,0.3)',
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
        }}></div>
      );
    }
    
    return stars;
  };

  // Helper function to get priority color and icon - Apple Design System
  const getPriorityStyle = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': 
        return { color: '#FF3B30', icon: '●', bgColor: '#FFF2F2' };
      case 'medium': 
        return { color: '#FF9500', icon: '●', bgColor: '#FFF8E6' };
      case 'low': 
        return { color: '#34C759', icon: '●', bgColor: '#F0FFF4' };
      default: 
        return { color: '#8E8E93', icon: '●', bgColor: '#F2F2F7' };
    }
  };

  // Helper function to get score color and emoji - Apple Design System
  const getScoreStyle = (score) => {
    if (score >= 80) return { color: '#34C759', emoji: '●', label: 'Good' };
    if (score >= 60) return { color: '#FF9500', emoji: '●', label: 'Good' };
    return { color: '#FF3B30', emoji: '●', label: 'Needs Work' };
  };

  // Helper function to format category names properly
  const formatCategoryName = (category) => {
    return category
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Collapsible section component - Apple Design Language
  const CollapsibleSection = ({ 
    title, 
    icon, 
    children, 
    sectionKey, 
    defaultColor = '#1D1D1F',
    count = null 
  }) => {
    const isExpanded = expandedSections[sectionKey];
    
    return (
      <div style={{ marginBottom: '20px' }}>
        <div 
          onClick={() => toggleSection(sectionKey)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            padding: '16px 20px',
            backgroundColor: '#F2F2F7',
            borderRadius: '16px',
            border: 'none',
            transition: 'all 0.2s ease',
            marginBottom: '0'
          }}
          className="collapsible-header"
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: defaultColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600'
            }}>{icon}</div>
            <span style={{
              fontSize: '17px',
              fontWeight: '600',
              color: defaultColor,
              letterSpacing: '-0.41px'
            }}>
              {title}
            </span>
            {count !== null && (
              <span style={{
                backgroundColor: defaultColor,
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '-0.08px'
              }}>
                {count}
              </span>
            )}
          </div>
          <div style={{
            fontSize: '14px',
            color: '#8E8E93',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}>
            ❯
          </div>
        </div>
        
        <div style={{
          maxHeight: isExpanded ? '2000px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          marginTop: isExpanded ? '12px' : '0',
          transform: isExpanded ? 'translateY(0)' : 'translateY(-5px)',
          opacity: isExpanded ? 1 : 0,
          willChange: isExpanded ? 'transform, max-height, opacity' : 'auto'
        }}>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '20px',
      border: 'none',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'
    }}>
      {/* Overall Rating Header - Apple Style */}
      <div style={{
        padding: '40px 32px',
        background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
        color: 'white',
        textAlign: 'center',
        position: 'relative',
        borderRadius: '20px 20px 0 0'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          fontSize: '17px',
          fontWeight: '600',
          marginBottom: '24px',
          opacity: 0.9,
          letterSpacing: '-0.41px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px'
          }}>●</div>
          Overall Interview Rating
        </div>
        <div style={{
          fontSize: '64px',
          fontWeight: '700',
          marginBottom: '20px',
          letterSpacing: '-0.04em',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif'
        }}>
          {rating.overallRating}/10
        </div>
        <div style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'center',
          gap: '6px'
        }}>
          {renderStarRating(rating.overallRating)}
        </div>
        {rating.summary && (
          <div style={{
            fontSize: '15px',
            fontStyle: 'normal',
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: '1.47',
            opacity: 0.95,
            fontWeight: '400',
            letterSpacing: '-0.24px'
          }}>
            "{rating.summary}"
          </div>
        )}
      </div>

      {/* Content Sections - Redesigned */}
      <div style={{ padding: '32px' }}>
        
        {/* Strengths Section */}
        {rating.strengths && rating.strengths.length > 0 && (
          <CollapsibleSection 
            title="Strengths" 
            icon="✓" 
            sectionKey="strengths"
            defaultColor="#34C759"
            count={rating.strengths.length}
          >
            <div style={{
              backgroundColor: '#F0FFF4',
              borderRadius: '16px',
              padding: '20px',
              border: 'none',
              marginTop: '12px'
            }}>
              {rating.strengths.map((strength, index) => (
                <div key={index} style={{
                  marginBottom: index < rating.strengths.length - 1 ? '12px' : '0',
                  fontSize: '15px',
                  color: '#1D1D1F',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  lineHeight: '1.47',
                  letterSpacing: '-0.24px'
                }}>
                  <div style={{ 
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#34C759',
                    borderRadius: '50%',
                    marginTop: '7px',
                    flexShrink: 0
                  }}></div>
                  <span style={{ fontWeight: '400' }}>{strength}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Areas for Improvement Section */}
        {rating.weaknesses && rating.weaknesses.length > 0 && (
          <CollapsibleSection 
            title="Areas for Improvement" 
            icon="△" 
            sectionKey="weaknesses"
            defaultColor="#FF3B30"
            count={rating.weaknesses.length}
          >
            <div style={{
              backgroundColor: '#FFF2F2',
              borderRadius: '16px',
              padding: '20px',
              border: 'none',
              marginTop: '12px'
            }}>
              {rating.weaknesses.map((weakness, index) => (
                <div key={index} style={{
                  marginBottom: index < rating.weaknesses.length - 1 ? '12px' : '0',
                  fontSize: '15px',
                  color: '#1D1D1F',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  lineHeight: '1.47',
                  letterSpacing: '-0.24px'
                }}>
                  <div style={{ 
                    width: '6px',
                    height: '6px',
                    backgroundColor: '#FF3B30',
                    borderRadius: '50%',
                    marginTop: '7px',
                    flexShrink: 0
                  }}></div>
                  <span style={{ fontWeight: '400' }}>{weakness}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Recommendations Section */}
        {rating.recommendations && rating.recommendations.length > 0 && (
          <CollapsibleSection 
            title="Actionable Recommendations" 
            icon="○" 
            sectionKey="recommendations"
            defaultColor="#007AFF"
            count={rating.recommendations.length}
          >
            <div style={{ marginTop: '12px' }}>
              {rating.recommendations.map((rec, index) => {
                const priorityStyle = getPriorityStyle(rec.priority);
                return (
                  <div key={index} style={{
                    backgroundColor: '#F2F2F7',
                    borderRadius: '16px',
                    padding: '20px',
                    marginBottom: index < rating.recommendations.length - 1 ? '12px' : '0',
                    border: 'none',
                    position: 'relative'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1D1D1F',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        letterSpacing: '-0.32px'
                      }}>
                        <div style={{ 
                          width: '8px', 
                          height: '8px',
                          backgroundColor: priorityStyle.color,
                          borderRadius: '50%',
                          flexShrink: 0
                        }}></div>
                        {rec.area}
                      </div>
                      <div style={{
                        backgroundColor: priorityStyle.color,
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08px'
                      }}>
                        {rec.priority}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '15px',
                      color: '#1D1D1F',
                      lineHeight: '1.47',
                      marginBottom: rec.examples ? '16px' : '0',
                      fontWeight: '400',
                      letterSpacing: '-0.24px'
                    }}>
                      {rec.suggestion}
                    </div>
                    {rec.examples && rec.examples.length > 0 && (
                      <div style={{
                        fontSize: '14px',
                        color: '#8E8E93',
                        fontStyle: 'italic',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        borderRadius: '12px',
                        border: 'none',
                        letterSpacing: '-0.15px'
                      }}>
                        <strong style={{ color: '#1D1D1F' }}>Examples:</strong> {rec.examples.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}

        {/* Detailed Scores Section */}
        {rating.detailedScores && (
          <CollapsibleSection 
            title="Detailed Performance Scores" 
            icon="■" 
            sectionKey="detailedScores"
            defaultColor="#5856D6"
            count={Object.keys(rating.detailedScores).length}
          >
            <div style={{
              display: 'grid',
              gap: '12px',
              marginTop: '12px'
            }}>
              {Object.entries(rating.detailedScores).map(([category, score]) => {
                const scoreStyle = getScoreStyle(score);
                return (
                  <div key={category} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    backgroundColor: '#F2F2F7',
                    borderRadius: '16px',
                    border: 'none',
                    transition: 'all 0.2s ease'
                  }}
                  className="score-item"
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: scoreStyle.color,
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        {scoreStyle.emoji}
                      </div>
                      <div>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1D1D1F',
                          marginBottom: '2px',
                          letterSpacing: '-0.32px'
                        }}>
                          {formatCategoryName(category)}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: scoreStyle.color,
                          fontWeight: '500',
                          letterSpacing: '-0.08px'
                        }}>
                          {scoreStyle.label}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        fontSize: '17px',
                        fontWeight: '600',
                        color: scoreStyle.color,
                        letterSpacing: '-0.41px'
                      }}>
                        {score}/100
                      </div>
                      <div style={{
                        width: '60px',
                        height: '6px',
                        backgroundColor: 'rgba(142,142,147,0.2)',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: `${score}%`,
                          height: '100%',
                          backgroundColor: scoreStyle.color,
                          borderRadius: '3px',
                          transition: 'width 1s ease',
                          position: 'relative'
                        }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}
      </div>

      <style jsx>{`
        .collapsible-header {
          will-change: transform, background-color;
        }
        .collapsible-header:hover {
          background-color: #E5E5EA !important;
          transform: scale(0.98);
        }
        .score-item {
          will-change: transform, background-color;
        }
        .score-item:hover {
          background-color: #E5E5EA !important;
          transform: scale(0.98);
        }
        @keyframes starPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default AIRatingDisplay; 