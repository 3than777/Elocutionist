import React, { useState, useEffect } from 'react';
import { getAIRatingsHistory } from '../services/api';
import { useTheme } from '../context/ThemeContext';

// InterviewSkillsGraph component
const InterviewSkillsGraph = ({ isDark }) => {
  // Hardcoded data for now
  const interviewData = [
    { interview: 1, contentRelevance: 45, communication: 50, confidence: 60, structure: 40, engagement: 65 },
    { interview: 2, contentRelevance: 55, communication: 52, confidence: 58, structure: 48, engagement: 70 },
    { interview: 3, contentRelevance: 60, communication: 58, confidence: 65, structure: 55, engagement: 72 },
    { interview: 4, contentRelevance: 68, communication: 65, confidence: 70, structure: 62, engagement: 75 },
    { interview: 5, contentRelevance: 75, communication: 70, confidence: 78, structure: 68, engagement: 80 },
    { interview: 6, contentRelevance: 78, communication: 75, confidence: 82, structure: 72, engagement: 85 },
    { interview: 7, contentRelevance: 80, communication: 77, confidence: 85, structure: 74, engagement: 87 },
    { interview: 8, contentRelevance: 82, communication: 79, confidence: 86, structure: 76, engagement: 89 },
    { interview: 9, contentRelevance: 84, communication: 81, confidence: 88, structure: 78, engagement: 90 },
    { interview: 10, contentRelevance: 85, communication: 83, confidence: 89, structure: 80, engagement: 92 },
  ];

  const skills = [
    { name: 'contentRelevance', label: 'Content Relevance', color: '#EF4444' },
    { name: 'communication', label: 'Communication', color: '#F59E0B' },
    { name: 'confidence', label: 'Confidence', color: '#10B981' },
    { name: 'structure', label: 'Structure', color: '#3B82F6' },
    { name: 'engagement', label: 'Engagement', color: '#8B5CF6' },
  ];

  // Chart dimensions
  const width = 750;
  const height = 300;
  const margin = { top: 20, right: 150, bottom: 60, left: 70 };
  const graphWidth = width - margin.left - margin.right;
  const graphHeight = height - margin.top - margin.bottom;

  // Scale functions
  const xScale = (interviewNum) => {
    return (interviewNum - 1) * (graphWidth / (interviewData.length - 1));
  };

  const yScale = (value) => {
    return graphHeight - (value / 100) * graphHeight;
  };

  // Create path for each skill
  const createPath = (skillName) => {
    return interviewData
      .map((data, index) => {
        const x = xScale(data.interview);
        const y = yScale(data[skillName]);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto', minWidth: width }}>
      <svg width={width} height={height} style={{ fontFamily: 'inherit' }} viewBox={`0 0 ${width} ${height}`}>
        <g transform={`translate(${margin.left}, ${margin.top})`}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((value) => (
            <g key={value}>
              <line
                x1={0}
                y1={yScale(value)}
                x2={graphWidth}
                y2={yScale(value)}
                stroke={isDark ? "#404040" : "#E5E7EB"}
                strokeDasharray="2,2"
              />
              <text
                x={-10}
                y={yScale(value) + 4}
                textAnchor="end"
                fontSize="12"
                fill={isDark ? "#a0a0a0" : "#6B7280"}
              >
                {value}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {interviewData.map((data) => (
            <text
              key={data.interview}
              x={xScale(data.interview)}
              y={graphHeight + 25}
              textAnchor="middle"
              fontSize="12"
              fill={isDark ? "#a0a0a0" : "#6B7280"}
            >
              {data.interview}
            </text>
          ))}

          {/* X-axis title */}
          <text
            x={graphWidth / 2}
            y={graphHeight + 50}
            textAnchor="middle"
            fontSize="14"
            fill={isDark ? "#e0e0e0" : "#374151"}
            fontWeight="500"
          >
            Interview
          </text>

          {/* Y-axis title */}
          <text
            x={-35}
            y={graphHeight / 2}
            textAnchor="middle"
            fontSize="14"
            fill={isDark ? "#e0e0e0" : "#374151"}
            fontWeight="500"
            transform={`rotate(-90, -35, ${graphHeight / 2})`}
          >
            Score
          </text>

          {/* Skill lines */}
          {skills.map((skill) => (
            <g key={skill.name}>
              <path
                d={createPath(skill.name)}
                fill="none"
                stroke={skill.color}
                strokeWidth="2"
              />
              {/* Data points */}
              {interviewData.map((data) => (
                <circle
                  key={`${skill.name}-${data.interview}`}
                  cx={xScale(data.interview)}
                  cy={yScale(data[skill.name])}
                  r="4"
                  fill={skill.color}
                />
              ))}
            </g>
          ))}

          {/* Legend */}
          <g transform={`translate(${graphWidth + 20}, 20)`}>
            {skills.map((skill, index) => (
              <g key={skill.name} transform={`translate(0, ${index * 25})`}>
                <line
                  x1={0}
                  y1={0}
                  x2={20}
                  y2={0}
                  stroke={skill.color}
                  strokeWidth="2"
                />
                <text
                  x={25}
                  y={4}
                  fontSize="12"
                  fill={isDark ? "#e0e0e0" : "#374151"}
                >
                  {skill.label}
                </text>
              </g>
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
};

// SkillsDistributionPieChart component
const SkillsDistributionPieChart = ({ isDark }) => {
  // Hardcoded data for now - can be made dynamic later
  const skillsData = [
    { name: 'Content Relevance', percentage: 22, color: '#EF4444' },
    { name: 'Communication', percentage: 20, color: '#F59E0B' },
    { name: 'Confidence', percentage: 25, color: '#10B981' },
    { name: 'Structure', percentage: 15, color: '#3B82F6' },
    { name: 'Engagement', percentage: 18, color: '#8B5CF6' }
  ];

  const centerX = 120;
  const centerY = 120;
  const radius = 80;
  const labelRadius = radius + 30;

  // Calculate pie slices
  let cumulativePercentage = 0;
  const slices = skillsData.map((skill) => {
    const startAngle = (cumulativePercentage * 360) / 100;
    const endAngle = ((cumulativePercentage + skill.percentage) * 360) / 100;
    cumulativePercentage += skill.percentage;
    
    return {
      ...skill,
      startAngle,
      endAngle
    };
  });

  // Convert polar to cartesian coordinates
  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  // Create SVG path for a slice
  const createSlicePath = (startAngle, endAngle) => {
    const start = polarToCartesian(centerX, centerY, radius, endAngle);
    const end = polarToCartesian(centerX, centerY, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    
    return [
      'M', centerX, centerY,
      'L', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
      'Z'
    ].join(' ');
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="240" height="240" style={{ fontFamily: 'inherit' }}>
        {/* Pie slices */}
        {slices.map((slice, index) => {
          const midAngle = (slice.startAngle + slice.endAngle) / 2;
          const labelPos = polarToCartesian(centerX, centerY, labelRadius, midAngle);
          const innerLabelPos = polarToCartesian(centerX, centerY, radius * 0.7, midAngle);
          
          return (
            <g key={slice.name}>
              {/* Slice */}
              <path
                d={createSlicePath(slice.startAngle, slice.endAngle)}
                fill={slice.color}
                stroke={isDark ? "#2a2a2a" : "white"}
                strokeWidth="2"
              />
              
              {/* Percentage label inside slice */}
              <text
                x={innerLabelPos.x}
                y={innerLabelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="14"
                fontWeight="600"
                fill="white"
              >
                {slice.percentage}%
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ 
        marginTop: '20px', 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr',
        gap: '8px 16px',
        width: '100%'
      }}>
        {skillsData.map((skill) => (
          <div key={skill.name} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '12px',
            color: isDark ? '#e0e0e0' : '#374151'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: skill.color,
              borderRadius: '2px',
              flexShrink: 0
            }}></div>
            <span style={{ fontSize: '11px' }}>{skill.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Dashboard = ({ aiRating }) => {
  const { isDark } = useTheme();
  const [ratingsHistory, setRatingsHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalInterviews, setTotalInterviews] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [practiceSessions, setPracticeSessions] = useState(0);
  const [showBetaNotification, setShowBetaNotification] = useState(true);
  
  // Fetch ratings history on component mount
  useEffect(() => {
    const fetchRatingsData = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      setIsLoading(true);
      try {
        const response = await getAIRatingsHistory(token, 100, 0); // Fetch up to 100 ratings
        if (response.data) {
          setRatingsHistory(response.data.ratings);
          setTotalInterviews(response.data.statistics.totalRatings || 0);
          
          // Calculate average score from all ratings
          if (response.data.ratings && response.data.ratings.length > 0) {
            const allScores = [];
            response.data.ratings.forEach(rating => {
              if (rating.rating.detailedScores) {
                const scores = Object.values(rating.rating.detailedScores);
                allScores.push(...scores);
              }
            });
            const avgScoreCalc = allScores.length > 0 ? 
              allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
            setAvgScore(Math.round(avgScoreCalc));
          }
          
          // Set practice sessions (same as total interviews for now)
          setPracticeSessions(response.data.statistics.totalRatings || 0);
        }
      } catch (error) {
        console.error('Dashboard: Error fetching ratings history:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRatingsData();
  }, []);

  const monthlyData = [
    { month: 'Oct 2019', inpatients: 1200, outpatients: 2800 },
    { month: 'Nov 2019', inpatients: 1600, outpatients: 3100 },
    { month: 'Dec 2019', inpatients: 1300, outpatients: 4200 },
    { month: 'Jan 2020', inpatients: 1100, outpatients: 2600 },
    { month: 'Feb 2020', inpatients: 1400, outpatients: 2900 },
    { month: 'Mar 2020', inpatients: 1000, outpatients: 3500 }
  ];

  const divisionData = [
    { name: 'Cardiology', patients: 247 },
    { name: 'Neurology', patients: 164 },
    { name: 'Surgery', patients: 86 }
  ];

  // Helper function to get score color
  const getScoreColor = (score) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <div style={{ 
      padding: '24px',
      backgroundColor: isDark ? '#1a1a1a' : 'var(--background-primary)',
      minHeight: 'calc(100vh - 48px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      flex: 1
    }}>
      {/* Beta Notification Popup */}
      {showBetaNotification && (
        <>
          {/* Backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
              cursor: 'pointer'
            }} 
            onClick={() => setShowBetaNotification(false)} 
          />
          
          {/* Popup */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: isDark ? '#2a2a2a' : '#ffffff',
            border: `2px solid ${isDark ? '#505050' : '#E5E7EB'}`,
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 1000,
            maxWidth: '420px',
            width: '90%'
          }}>
            {/* Close button */}
            <button
              onClick={() => setShowBetaNotification(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: isDark ? '#b0b0b0' : '#6B7280',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
                e.target.style.color = isDark ? '#ffffff' : '#1F2937';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = isDark ? '#b0b0b0' : '#6B7280';
              }}
            >
              ×
            </button>
            
            {/* Content */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ 
                fontSize: '32px',
                flexShrink: 0,
                marginTop: '-4px'
              }}>
                🚧
              </div>
              <div>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '20px',
                  fontWeight: '600',
                  color: isDark ? '#ffffff' : '#1F2937',
                  letterSpacing: '-0.025em'
                }}>
                  Dashboard Beta
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: isDark ? '#b0b0b0' : '#6B7280'
                }}>
                  This feature is currently in beta. Some features might not work, or may contain placeholder/hardcoded data while we continue development.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Top Stats Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 2fr',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Combined Stats Card */}
        <div style={{
          backgroundColor: isDark ? '#2a2a2a' : 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          border: isDark ? '2px solid #505050' : '2px solid #E5E7EB',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: isDark ? '#ffffff' : '#1F2937', 
            marginBottom: '24px',
            margin: '0 0 24px 0'
          }}>
            Statistics
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Overall Rating */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#E8E5FF',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '20px' }}>⭐</span>
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: isDark ? '#ffffff' : '#1F2937', lineHeight: '1' }}>
                    N/A
                  </div>
                  <div style={{ fontSize: '13px', color: isDark ? '#a0a0a0' : '#6B7280' }}>Overall Rating</div>
                </div>
              </div>
            </div>

            {/* Total Interviews */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#E0F2FE',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '20px' }}>🎤</span>
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: isDark ? '#ffffff' : '#1F2937', lineHeight: '1' }}>
                    {totalInterviews}
                  </div>
                  <div style={{ fontSize: '13px', color: isDark ? '#a0a0a0' : '#6B7280' }}>Total Interviews</div>
                </div>
              </div>
            </div>

            {/* Average Score */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#FFF7ED',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '20px' }}>📊</span>
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: isDark ? '#ffffff' : '#1F2937', lineHeight: '1' }}>
                    N/A
                  </div>
                  <div style={{ fontSize: '13px', color: isDark ? '#a0a0a0' : '#6B7280' }}>Average Score</div>
                </div>
              </div>
            </div>

            {/* Hours Spent */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#F3E8FF',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <span style={{ fontSize: '20px' }}>🕐</span>
                </div>
                <div>
                  <div style={{ fontSize: '28px', fontWeight: '700', color: isDark ? '#ffffff' : '#1F2937', lineHeight: '1' }}>
                    N/A
                  </div>
                  <div style={{ fontSize: '13px', color: isDark ? '#a0a0a0' : '#6B7280' }}>Hours Spent</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Elocutionist Score Card */}
        <div style={{
          backgroundColor: isDark ? '#2a2a2a' : 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          border: isDark ? '2px solid #505050' : '2px solid #E5E7EB',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: isDark ? '#ffffff' : '#1F2937', 
            marginBottom: '32px',
            margin: '0 0 32px 0',
            alignSelf: 'flex-start',
            width: '100%'
          }}>
            Usage
          </h3>
          
          {/* Three Circular Progress Bars */}
          <div style={{ 
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            gap: '20px',
            width: '100%',
            marginTop: '-20px'
          }}>
            {/* Left Progress Circle - 62% */}
            <div style={{ 
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{ position: 'relative' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={isDark ? "#505050" : "#D1D5DB"}
                    strokeWidth="8"
                  />
                  
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40 * 0.62} ${2 * Math.PI * 40 * 0.38}`}
                    strokeDashoffset={2 * Math.PI * 40 * 0.25}
                    transform="rotate(-90 50 50)"
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Percentage text */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '26px',
                  fontWeight: '700',
                  color: isDark ? '#ffffff' : '#1F2937'
                }}>
                  62%
                </div>
              </div>
              
              {/* Label text */}
              <div style={{
                marginTop: '8px',
                textAlign: 'center',
                fontSize: '14px',
                color: isDark ? '#ffffff' : '#000000',
                lineHeight: '1.3'
              }}>
                <div>Tokens</div>
                <div>Remaining</div>
              </div>
            </div>

            {/* Middle Progress Circle - 75% */}
            <div style={{ 
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{ position: 'relative' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={isDark ? "#404040" : "#E5E7EB"}
                    strokeWidth="8"
                  />
                  
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40 * 0.75} ${2 * Math.PI * 40 * 0.25}`}
                    strokeDashoffset={2 * Math.PI * 40 * 0.25}
                    transform="rotate(-90 50 50)"
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Percentage text */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '26px',
                  fontWeight: '700',
                  color: isDark ? '#ffffff' : '#1F2937'
                }}>
                  75%
                </div>
              </div>
              
              {/* Label text */}
              <div style={{
                marginTop: '8px',
                textAlign: 'center',
                fontSize: '14px',
                color: isDark ? '#ffffff' : '#000000',
                lineHeight: '1.3'
              }}>
                <div>Dynamic Hints</div>
                <div>Remaining</div>
              </div>
            </div>

            {/* Right Progress Circle - 88% */}
            <div style={{ 
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <div style={{ position: 'relative' }}>
                <svg width="100" height="100" viewBox="0 0 100 100">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke={isDark ? "#404040" : "#E5E7EB"}
                    strokeWidth="8"
                  />
                  
                  {/* Progress circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#8B5CF6"
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40 * 0.88} ${2 * Math.PI * 40 * 0.12}`}
                    strokeDashoffset={2 * Math.PI * 40 * 0.25}
                    transform="rotate(-90 50 50)"
                    strokeLinecap="round"
                  />
                </svg>
                
                {/* Percentage text */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '26px',
                  fontWeight: '700',
                  color: isDark ? '#ffffff' : '#1F2937'
                }}>
                  88%
                </div>
              </div>
              
              {/* Label text */}
              <div style={{
                marginTop: '8px',
                textAlign: 'center',
                fontSize: '14px',
                color: isDark ? '#ffffff' : '#000000',
                lineHeight: '1.3'
              }}>
                <div>Comprehensive Reviews</div>
                <div>Remaining</div>
              </div>
            </div>
          </div>
        </div>

        {/* Empty space for future content */}
        <div></div>
      </div>

      {/* Interview Skills Performance and Skills Distribution Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '7fr 3fr', gap: '20px', marginBottom: '20px' }}>
        {/* Interview Skills Performance Chart */}
        <div style={{
          backgroundColor: isDark ? '#2a2a2a' : 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          border: isDark ? '2px solid #505050' : '2px solid #E5E7EB'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: isDark ? '#ffffff' : '#1F2937', margin: 0 }}>
              Interview Skills Performance
            </h3>
          </div>
          
          {/* Line Graph and Skill Bars */}
          <div style={{ display: 'flex', gap: '30px', alignItems: 'center', justifyContent: 'flex-start' }}>
            {/* Graph */}
            <div style={{ flex: '1 1 auto' }}>
              <InterviewSkillsGraph isDark={isDark} />
            </div>
            
            {/* Skill Bars */}
            <div style={{ flex: '0 0 300px', paddingRight: '40px', alignSelf: 'center', marginTop: '-25px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '600', color: isDark ? '#e0e0e0' : '#374151', marginBottom: '16px' }}>
                Most Recent Scores
              </h4>
              {[
                { skill: 'Content Relevance', score: 68, color: '#F59E0B' },
                { skill: 'Communication', score: 63, color: '#F59E0B' },
                { skill: 'Confidence', score: 70, color: '#F59E0B' },
                { skill: 'Structure', score: 58, color: '#EF4444' },
                { skill: 'Engagement', score: 75, color: '#F59E0B' }
              ].map((item) => {
                return (
                  <div key={item.skill} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', color: isDark ? '#e0e0e0' : '#374151', fontWeight: '500' }}>
                        {item.skill}
                      </span>
                      <span style={{ fontSize: '14px', color: item.color, fontWeight: '600' }}>
                        {item.score}/100
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      backgroundColor: isDark ? '#505050' : '#E5E7EB', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${item.score}%`,
                        height: '100%',
                        backgroundColor: item.color,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Skills Distribution Pie Chart */}
        <div style={{
          backgroundColor: isDark ? '#2a2a2a' : 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          border: isDark ? '2px solid #505050' : '2px solid #E5E7EB'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: isDark ? '#ffffff' : '#1F2937', marginBottom: '24px', margin: '0 0 24px 0' }}>
            Skills Distribution
          </h3>
          <SkillsDistributionPieChart isDark={isDark} />
        </div>
      </div>

      {/* Strengths, Areas for Improvement, and Top Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Strengths */}
            <div style={{
              backgroundColor: isDark ? '#2a2a2a' : 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              border: isDark ? '2px solid #505050' : '2px solid #E5E7EB'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: isDark ? '#ffffff' : '#1F2937', marginBottom: '16px' }}>
                Strengths
              </h3>
              {aiRating && aiRating.strengths && aiRating.strengths.length > 0 ? (
                <div>
                  {aiRating.strengths.slice(0, 3).map((strength, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <span style={{ color: '#10B981', fontSize: '16px', marginTop: '-2px' }}>✓</span>
                      <span style={{ fontSize: '14px', color: isDark ? '#e0e0e0' : '#374151', lineHeight: '1.5' }}>
                        {strength}
                      </span>
                    </div>
                  ))}
                  {aiRating.strengths.length > 3 && (
                    <div style={{ fontSize: '13px', color: isDark ? '#a0a0a0' : '#6B7280', marginTop: '8px' }}>
                      +{aiRating.strengths.length - 3} more strengths
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: isDark ? '#808080' : '#9CA3AF' }}>
                  Complete an interview to see your strengths
                </div>
              )}
            </div>

            {/* Areas for Improvement */}
            <div style={{
              backgroundColor: isDark ? '#2a2a2a' : 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              border: isDark ? '2px solid #505050' : '2px solid #E5E7EB'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: isDark ? '#ffffff' : '#1F2937', marginBottom: '16px' }}>
                Areas for Improvement
              </h3>
              {aiRating && aiRating.weaknesses && aiRating.weaknesses.length > 0 ? (
                <div>
                  {aiRating.weaknesses.slice(0, 3).map((weakness, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <span style={{ color: '#EF4444', fontSize: '16px', marginTop: '-2px' }}>•</span>
                      <span style={{ fontSize: '14px', color: isDark ? '#e0e0e0' : '#374151', lineHeight: '1.5' }}>
                        {weakness}
                      </span>
                    </div>
                  ))}
                  {aiRating.weaknesses.length > 3 && (
                    <div style={{ fontSize: '13px', color: isDark ? '#a0a0a0' : '#6B7280', marginTop: '8px' }}>
                      +{aiRating.weaknesses.length - 3} more areas
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: isDark ? '#808080' : '#9CA3AF' }}>
                  Complete an interview to see areas for improvement
                </div>
              )}
            </div>

            {/* Top Recommendations */}
            <div style={{
              backgroundColor: isDark ? '#2a2a2a' : 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              border: isDark ? '2px solid #505050' : '2px solid #E5E7EB'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: isDark ? '#ffffff' : '#1F2937', marginBottom: '16px' }}>
                Top Recommendations
              </h3>
              {aiRating && aiRating.recommendations && aiRating.recommendations.length > 0 ? (
                <div>
                  {aiRating.recommendations.slice(0, 3).map((rec, index) => {
                    const priorityColor = rec.priority === 'high' ? '#EF4444' : 
                                         rec.priority === 'medium' ? '#F59E0B' : '#10B981';
                    return (
                      <div key={index} style={{ 
                        marginBottom: '16px',
                        paddingBottom: '16px',
                        borderBottom: index < 2 ? `2px solid ${isDark ? '#505050' : '#E5E7EB'}` : 'none'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: isDark ? '#ffffff' : '#1F2937' }}>
                            {rec.area}
                          </span>
                          <span style={{ 
                            fontSize: '11px', 
                            color: priorityColor,
                            backgroundColor: priorityColor + '20',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            {rec.priority}
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: isDark ? '#a0a0a0' : '#6B7280', lineHeight: '1.5', margin: 0 }}>
                          {rec.suggestion}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: isDark ? '#808080' : '#9CA3AF' }}>
                  Complete an interview to get personalized recommendations
                </div>
              )}
            </div>
          </div>

      {/* Interview Summary - Full Width Row */}
      <div style={{
        marginTop: '20px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
          borderRadius: '12px',
          padding: '24px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', opacity: 0.9 }}>Interview Summary</h3>
          {aiRating && aiRating.summary ? (
            <p style={{ fontSize: '15px', lineHeight: '1.6', margin: 0 }}>
              "{aiRating.summary}"
            </p>
          ) : (
            <p style={{ fontSize: '15px', lineHeight: '1.6', margin: 0, opacity: 0.8 }}>
              Your AI-generated interview summary will appear here after completing an interview session.
            </p>
          )}
          
          {/* Decorative element */}
          <div style={{ 
            position: 'absolute',
            right: '-20px',
            bottom: '-20px',
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)'
          }}></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;