import React, { useState, useEffect } from 'react';
import { getAIRatingsHistory } from '../services/api';

// InterviewSkillsGraph component
const InterviewSkillsGraph = () => {
  // Hardcoded data for now
  const interviewData = [
    { interview: 1, contentRelevance: 45, communication: 50, confidence: 60, structure: 40, engagement: 65 },
    { interview: 2, contentRelevance: 55, communication: 52, confidence: 58, structure: 48, engagement: 70 },
    { interview: 3, contentRelevance: 60, communication: 58, confidence: 65, structure: 55, engagement: 72 },
    { interview: 4, contentRelevance: 68, communication: 65, confidence: 70, structure: 62, engagement: 75 },
    { interview: 5, contentRelevance: 75, communication: 70, confidence: 78, structure: 68, engagement: 80 },
    { interview: 6, contentRelevance: 78, communication: 75, confidence: 82, structure: 72, engagement: 85 },
  ];

  const skills = [
    { name: 'contentRelevance', label: 'Content Relevance', color: '#EF4444' },
    { name: 'communication', label: 'Communication', color: '#F59E0B' },
    { name: 'confidence', label: 'Confidence', color: '#10B981' },
    { name: 'structure', label: 'Structure', color: '#3B82F6' },
    { name: 'engagement', label: 'Engagement', color: '#8B5CF6' },
  ];

  // Chart dimensions
  const width = 700;
  const height = 300;
  const margin = { top: 20, right: 160, bottom: 40, left: 50 };
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
                stroke="#E5E7EB"
                strokeDasharray="2,2"
              />
              <text
                x={-10}
                y={yScale(value) + 4}
                textAnchor="end"
                fontSize="12"
                fill="#6B7280"
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
              fill="#6B7280"
            >
              Interview {data.interview}
            </text>
          ))}

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
                  fill="#374151"
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
const SkillsDistributionPieChart = () => {
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
                stroke="white"
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
            color: '#374151'
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
  const [ratingsHistory, setRatingsHistory] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [totalInterviews, setTotalInterviews] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [practiceSessions, setPracticeSessions] = useState(0);
  
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
      backgroundColor: 'var(--background-primary)',
      minHeight: 'calc(100vh - 48px)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      flex: 1
    }}>
      {/* Top Stats Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Combined Stats Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: '600', 
            color: '#1F2937', 
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
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1F2937', lineHeight: '1' }}>
                    N/A
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>Overall Rating</div>
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
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1F2937', lineHeight: '1' }}>
                    {totalInterviews}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>Total Interviews</div>
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
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1F2937', lineHeight: '1' }}>
                    N/A
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>Average Score</div>
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
                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1F2937', lineHeight: '1' }}>
                    N/A
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280' }}>Hours Spent</div>
                </div>
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
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
              Interview Skills Performance
            </h3>
          </div>
          
          {/* Line Graph and Skill Bars */}
          <div style={{ display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
            {/* Graph */}
            <div style={{ flex: '1 1 auto' }}>
              <InterviewSkillsGraph />
            </div>
            
            {/* Skill Bars */}
            <div style={{ flex: '0 0 320px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '16px' }}>
                Most Recent Scores
              </h4>
              {[
                { skill: 'Content Relevance', score: 68 },
                { skill: 'Communication', score: 63 },
                { skill: 'Confidence', score: 70 },
                { skill: 'Structure', score: 58 },
                { skill: 'Engagement', score: 75 }
              ].map((item) => {
                const scoreColor = getScoreColor(item.score);
                return (
                  <div key={item.skill} style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#374151' }}>
                        {item.skill}
                      </span>
                      <span style={{ fontSize: '13px', color: scoreColor, fontWeight: '600' }}>
                        {item.score}/100
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '6px', 
                      backgroundColor: '#F3F4F6', 
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${item.score}%`,
                        height: '100%',
                        backgroundColor: scoreColor,
                        borderRadius: '3px',
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
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1F2937', marginBottom: '24px', margin: '0 0 24px 0' }}>
            Skills Distribution
          </h3>
          <SkillsDistributionPieChart />
        </div>
      </div>

      {/* Strengths, Areas for Improvement, and Top Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Strengths */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
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
                      <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                        {strength}
                      </span>
                    </div>
                  ))}
                  {aiRating.strengths.length > 3 && (
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>
                      +{aiRating.strengths.length - 3} more strengths
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                  Complete an interview to see your strengths
                </div>
              )}
            </div>

            {/* Areas for Improvement */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
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
                      <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                        {weakness}
                      </span>
                    </div>
                  ))}
                  {aiRating.weaknesses.length > 3 && (
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '8px' }}>
                      +{aiRating.weaknesses.length - 3} more areas
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                  Complete an interview to see areas for improvement
                </div>
              )}
            </div>

            {/* Top Recommendations */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937', marginBottom: '16px' }}>
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
                        borderBottom: index < 2 ? '1px solid #F3F4F6' : 'none'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
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
                        <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.5', margin: 0 }}>
                          {rec.suggestion}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
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