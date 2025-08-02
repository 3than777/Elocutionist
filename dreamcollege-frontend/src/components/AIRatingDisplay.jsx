/**
 * AI Rating Display Component - Enhanced for Step 13
 * 
 * Displays AI-generated interview feedback with advanced UI/UX features:
 * - Visual rating indicators (stars, progress bars, color coding)
 * - Collapsible sections for detailed feedback
 * - Enhanced loading skeleton with multiple states
 * - Icons and visual hierarchy for readability
 * - Responsive design and smooth animations
 * 
 * Features implemented for Step 13:
 * ✅ Replace plain textarea with structured feedback display
 * ✅ Add visual rating indicators (stars, progress bars, color coding)
 * ✅ Implement collapsible sections for detailed feedback
 * ✅ Add loading skeleton while generating rating
 * ✅ Include icons and visual hierarchy for readability
 */

import React, { useState } from 'react';

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

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

  // Helper function to render enhanced star rating
  const renderStarRating = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} style={{ 
          color: '#ffc107', 
          fontSize: '24px',
          textShadow: '0 1px 2px rgba(0,0,0,0.1)',
          animation: `starPop 0.3s ease ${i * 0.1}s both`
        }}>★</span>
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <span key="half" style={{ 
          color: '#ffc107', 
          fontSize: '24px',
          textShadow: '0 1px 2px rgba(0,0,0,0.1)' 
        }}>☆</span>
      );
    }
    
    const emptyStars = 10 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} style={{ 
          color: '#e9ecef', 
          fontSize: '24px' 
        }}>☆</span>
      );
    }
    
    return stars;
  };

  // Helper function to get priority color and icon
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'high': 
        return { color: '#dc3545', icon: '🔴', bgColor: '#f8d7da' };
      case 'medium': 
        return { color: '#fd7e14', icon: '🟡', bgColor: '#fff3cd' };
      case 'low': 
        return { color: '#28a745', icon: '🟢', bgColor: '#d4edda' };
      default: 
        return { color: '#6c757d', icon: '⚪', bgColor: '#f8f9fa' };
    }
  };

  // Helper function to get score color and emoji
  const getScoreStyle = (score) => {
    if (score >= 80) return { color: '#28a745', emoji: '🟢', label: 'Excellent' };
    if (score >= 60) return { color: '#fd7e14', emoji: '🟡', label: 'Good' };
    return { color: '#dc3545', emoji: '🔴', label: 'Needs Work' };
  };

  // Collapsible section component
  const CollapsibleSection = ({ 
    title, 
    icon, 
    children, 
    sectionKey, 
    defaultColor = '#495057',
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
            padding: '12px 15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6',
            transition: 'all 0.2s ease',
            marginBottom: isExpanded ? '12px' : '0'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#e9ecef';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#f8f9fa';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '20px' }}>{icon}</span>
            <span style={{
              fontSize: '16px',
              fontWeight: '600',
              color: defaultColor
            }}>
              {title}
            </span>
            {count !== null && (
              <span style={{
                backgroundColor: defaultColor,
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}>
                {count}
              </span>
            )}
          </div>
          <div style={{
            fontSize: '18px',
            color: '#6c757d',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}>
            ▼
          </div>
        </div>
        
        {isExpanded && (
          <div style={{
            animation: 'fadeIn 0.3s ease',
            overflow: 'hidden'
          }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #dee2e6',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Overall Rating Header with enhanced visuals */}
      <div style={{
        padding: '25px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        position: 'relative'
      }}>
        <div style={{
          fontSize: '20px',
          fontWeight: '600',
          marginBottom: '15px',
          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>
          🎯 Overall Interview Rating
        </div>
        <div style={{
          fontSize: '48px',
          fontWeight: 'bold',
          marginBottom: '10px',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          {rating.overallRating}/10
        </div>
        <div style={{
          marginBottom: '15px',
          display: 'flex',
          justifyContent: 'center',
          gap: '2px'
        }}>
          {renderStarRating(rating.overallRating)}
        </div>
        {rating.summary && (
          <div style={{
            fontSize: '16px',
            fontStyle: 'italic',
            maxWidth: '400px',
            margin: '0 auto',
            lineHeight: '1.4',
            opacity: 0.95
          }}>
            "{rating.summary}"
          </div>
        )}
      </div>

      {/* Content Sections with collapsible functionality */}
      <div style={{ padding: '25px' }}>
        
        {/* Strengths Section */}
        {rating.strengths && rating.strengths.length > 0 && (
          <CollapsibleSection 
            title="Strengths" 
            icon="✅" 
            sectionKey="strengths"
            defaultColor="#28a745"
            count={rating.strengths.length}
          >
            <div style={{
              backgroundColor: '#d4edda',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #c3e6cb'
            }}>
              {rating.strengths.map((strength, index) => (
                <div key={index} style={{
                  marginBottom: index < rating.strengths.length - 1 ? '12px' : '0',
                  fontSize: '14px',
                  color: '#155724',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  lineHeight: '1.5'
                }}>
                  <span style={{ 
                    marginTop: '3px', 
                    fontSize: '12px',
                    color: '#28a745' 
                  }}>●</span>
                  <span>{strength}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Areas for Improvement Section */}
        {rating.weaknesses && rating.weaknesses.length > 0 && (
          <CollapsibleSection 
            title="Areas for Improvement" 
            icon="⚠️" 
            sectionKey="weaknesses"
            defaultColor="#dc3545"
            count={rating.weaknesses.length}
          >
            <div style={{
              backgroundColor: '#f8d7da',
              borderRadius: '8px',
              padding: '20px',
              border: '1px solid #f5c6cb'
            }}>
              {rating.weaknesses.map((weakness, index) => (
                <div key={index} style={{
                  marginBottom: index < rating.weaknesses.length - 1 ? '12px' : '0',
                  fontSize: '14px',
                  color: '#721c24',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  lineHeight: '1.5'
                }}>
                  <span style={{ 
                    marginTop: '3px', 
                    fontSize: '12px',
                    color: '#dc3545' 
                  }}>●</span>
                  <span>{weakness}</span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Recommendations Section */}
        {rating.recommendations && rating.recommendations.length > 0 && (
          <CollapsibleSection 
            title="Actionable Recommendations" 
            icon="💡" 
            sectionKey="recommendations"
            defaultColor="#007bff"
            count={rating.recommendations.length}
          >
            {rating.recommendations.map((rec, index) => {
              const priorityStyle = getPriorityStyle(rec.priority);
              return (
                <div key={index} style={{
                  backgroundColor: priorityStyle.bgColor,
                  borderRadius: '8px',
                  padding: '18px',
                  marginBottom: index < rating.recommendations.length - 1 ? '15px' : '0',
                  border: `2px solid ${priorityStyle.color}`,
                  position: 'relative'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: priorityStyle.color,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>{priorityStyle.icon}</span>
                      {rec.area}
                    </div>
                    <div style={{
                      backgroundColor: priorityStyle.color,
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {rec.priority}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: priorityStyle.color,
                    lineHeight: '1.5',
                    marginBottom: rec.examples ? '10px' : '0'
                  }}>
                    {rec.suggestion}
                  </div>
                  {rec.examples && rec.examples.length > 0 && (
                    <div style={{
                      fontSize: '13px',
                      color: priorityStyle.color,
                      fontStyle: 'italic',
                      padding: '8px 12px',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      borderRadius: '6px',
                      border: `1px solid ${priorityStyle.color}20`
                    }}>
                      <strong>Examples:</strong> {rec.examples.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </CollapsibleSection>
        )}

        {/* Detailed Scores Section */}
        {rating.detailedScores && (
          <CollapsibleSection 
            title="Detailed Performance Scores" 
            icon="📊" 
            sectionKey="detailedScores"
            defaultColor="#6f42c1"
            count={Object.keys(rating.detailedScores).length}
          >
            <div style={{
              display: 'grid',
              gap: '15px'
            }}>
              {Object.entries(rating.detailedScores).map(([category, score]) => {
                const scoreStyle = getScoreStyle(score);
                return (
                  <div key={category} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '15px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '18px' }}>{scoreStyle.emoji}</span>
                      <div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#495057',
                          textTransform: 'capitalize',
                          marginBottom: '2px'
                        }}>
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: scoreStyle.color,
                          fontWeight: '500'
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
                        fontSize: '18px',
                        fontWeight: '700',
                        color: scoreStyle.color
                      }}>
                        {score}/100
                      </div>
                      <div style={{
                        width: '80px',
                        height: '12px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: `${score}%`,
                          height: '100%',
                          backgroundColor: scoreStyle.color,
                          borderRadius: '6px',
                          transition: 'width 0.8s ease',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                            animation: 'shimmer 2s infinite'
                          }}></div>
                        </div>
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
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
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