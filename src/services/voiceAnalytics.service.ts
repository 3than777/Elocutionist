/**
 * AI Interview Coach Backend - Voice Analytics Service
 * 
 * This service provides comprehensive analytics for voice mode usage including
 * adoption rates, speech recognition accuracy, user preference patterns, and
 * error tracking by browser/device. It helps identify trends and optimize voice features.
 * 
 * Key Features:
 * - Voice mode adoption rate tracking
 * - Speech recognition accuracy metrics
 * - User preference pattern analysis
 * - Error rates by browser/device type
 * - Voice session performance monitoring
 * - Privacy-compliant anonymized data collection
 * 
 * Privacy Considerations:
 * - No actual speech content is stored or analyzed
 * - Only anonymized usage metrics and performance data
 * - User consent required for analytics collection
 * - GDPR and privacy regulation compliant
 * 
 * Related Files:
 * - src/routes/chat.routes.ts - Voice processing endpoint
 * - src/services/analytics.service.ts - General analytics patterns
 * - src/services/openai.service.ts - AI response optimization
 * 
 * Task: Voice Mode Feature Implementation - Step 15
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import { Types } from 'mongoose';

/**
 * Interface for voice mode adoption metrics
 */
export interface IVoiceAdoptionMetrics {
  totalUsers: number;
  voiceEnabledUsers: number;
  adoptionRate: number; // percentage of users who have enabled voice mode
  newAdoptersThisPeriod: number;
  averageSessionsPerUser: number;
  retentionRate: number; // percentage of users who continue using voice mode
}

/**
 * Interface for speech recognition accuracy metrics
 */
export interface ISpeechRecognitionMetrics {
  totalAttempts: number;
  successfulAttempts: number;
  accuracyRate: number; // percentage of successful recognitions
  averageConfidenceScore: number;
  errorsByType: Record<string, number>;
  averageProcessingTime: number; // milliseconds
  browserAccuracyRates: Record<string, number>;
}

/**
 * Interface for user preference patterns
 */
export interface IUserPreferencePatterns {
  mostPopularVoices: Array<{
    voiceName: string;
    usageCount: number;
    percentage: number;
  }>;
  averageSpeechRate: number;
  averageSpeechVolume: number;
  preferredVoiceGender: Record<string, number>;
  autoPlayPreference: {
    enabled: number;
    disabled: number;
  };
  languageDistribution: Record<string, number>;
}

/**
 * Interface for error tracking by browser/device
 */
export interface IVoiceErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  errorsByBrowser: Record<string, number>;
  errorsByDevice: Record<string, number>;
  errorTrends: Array<{
    date: Date;
    errorCount: number;
    errorType: string;
  }>;
  resolutionRate: number; // percentage of errors that were resolved
}

/**
 * Interface for voice session performance
 */
export interface IVoiceSessionMetrics {
  totalSessions: number;
  averageSessionDuration: number; // milliseconds
  averageVoiceInteractions: number;
  sessionCompletionRate: number; // percentage of sessions that completed successfully
  performanceByBrowser: Record<string, {
    sessionCount: number;
    averageDuration: number;
    completionRate: number;
  }>;
  devicePerformance: Record<string, {
    sessionCount: number;
    averageLatency: number;
    errorRate: number;
  }>;
}

/**
 * Interface for time-based voice analytics
 */
export interface IVoiceTimeBasedAnalytics {
  period: 'hour' | 'day' | 'week' | 'month';
  data: Array<{
    timestamp: Date;
    voiceSessions: number;
    speechAttempts: number;
    speechSuccesses: number;
    errors: number;
    uniqueUsers: number;
  }>;
}

/**
 * Interface for voice analytics dashboard summary
 */
export interface IVoiceAnalyticsSummary {
  adoption: IVoiceAdoptionMetrics;
  speechRecognition: ISpeechRecognitionMetrics;
  preferences: IUserPreferencePatterns;
  errors: IVoiceErrorMetrics;
  sessions: IVoiceSessionMetrics;
  recentActivity: IVoiceTimeBasedAnalytics;
}

/**
 * In-memory storage for voice analytics data
 * In production, this would be replaced with a proper database/analytics service
 */
interface IVoiceAnalyticsData {
  userId: string;
  timestamp: Date;
  event: 'voice_enabled' | 'voice_disabled' | 'speech_attempt' | 'speech_success' | 'speech_error' | 'session_start' | 'session_end' | 'preference_change';
  data: any;
  browserInfo: string | undefined;
  deviceInfo: string | undefined;
}

// In-memory storage (replace with database in production)
const voiceAnalyticsStore: IVoiceAnalyticsData[] = [];
const userVoicePreferences: Map<string, any> = new Map();
const voiceErrorLog: Array<{
  timestamp: Date;
  userId: string;
  errorType: string;
  errorMessage: string;
  browserInfo: string;
  resolved: boolean;
}> = [];

/**
 * Records a voice analytics event
 * 
 * @param {string} userId - User ID
 * @param {string} event - Event type
 * @param {any} data - Event data
 * @param {string} browserInfo - Browser information
 * @param {string} deviceInfo - Device information
 */
export function recordVoiceEvent(
  userId: string,
  event: 'voice_enabled' | 'voice_disabled' | 'speech_attempt' | 'speech_success' | 'speech_error' | 'session_start' | 'session_end' | 'preference_change',
  data: any,
  browserInfo?: string,
  deviceInfo?: string
): void {
  const analyticsEntry: IVoiceAnalyticsData = {
    userId,
    timestamp: new Date(),
    event,
    data,
    browserInfo,
    deviceInfo
  };

  voiceAnalyticsStore.push(analyticsEntry);
  
  // Log for debugging and external analytics services
  console.log('[VOICE ANALYTICS]', JSON.stringify(analyticsEntry));

  // Update user preferences if applicable
  if (event === 'preference_change' && data.preferences) {
    userVoicePreferences.set(userId, {
      ...userVoicePreferences.get(userId),
      ...data.preferences,
      lastUpdated: new Date()
    });
  }

  // Record errors in error log
  if (event === 'speech_error' && data.error) {
    voiceErrorLog.push({
      timestamp: new Date(),
      userId,
      errorType: data.error.errorType || 'unknown',
      errorMessage: data.error.errorMessage || '',
      browserInfo: browserInfo || 'unknown',
      resolved: false
    });
  }

  // In production, this would also:
  // - Send to analytics service (Google Analytics, Mixpanel, etc.)
  // - Store in analytics database
  // - Trigger real-time dashboards
  // - Send alerts for critical errors
}

/**
 * Gets voice mode adoption metrics
 * 
 * @param {Date} startDate - Start date for metrics
 * @param {Date} endDate - End date for metrics
 * @returns {Promise<IVoiceAdoptionMetrics>} Adoption metrics
 */
export async function getVoiceAdoptionMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<IVoiceAdoptionMetrics> {
  const now = new Date();
  const defaultStartDate = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const defaultEndDate = endDate || now;

  // Filter events by date range
  const periodEvents = voiceAnalyticsStore.filter(event => 
    event.timestamp >= defaultStartDate && event.timestamp <= defaultEndDate
  );

  // Calculate adoption metrics
  const allUsers = new Set(periodEvents.map(e => e.userId));
  const voiceEnabledUsers = new Set(
    periodEvents
      .filter(e => e.event === 'voice_enabled' || e.event === 'speech_attempt')
      .map(e => e.userId)
  );

  const newAdopters = new Set(
    periodEvents
      .filter(e => e.event === 'voice_enabled')
      .map(e => e.userId)
  );

  // Calculate session counts per user
  const sessionCounts = new Map<string, number>();
  periodEvents
    .filter(e => e.event === 'session_start')
    .forEach(e => {
      sessionCounts.set(e.userId, (sessionCounts.get(e.userId) || 0) + 1);
    });

  const averageSessionsPerUser = sessionCounts.size > 0
    ? Array.from(sessionCounts.values()).reduce((sum, count) => sum + count, 0) / sessionCounts.size
    : 0;

  // Calculate retention (users who used voice mode in both halves of the period)
  const midPoint = new Date((defaultStartDate.getTime() + defaultEndDate.getTime()) / 2);
  const firstHalfUsers = new Set(
    periodEvents
      .filter(e => e.timestamp < midPoint && (e.event === 'speech_attempt' || e.event === 'session_start'))
      .map(e => e.userId)
  );
  const secondHalfUsers = new Set(
    periodEvents
      .filter(e => e.timestamp >= midPoint && (e.event === 'speech_attempt' || e.event === 'session_start'))
      .map(e => e.userId)
  );

  const retainedUsers = new Set([...firstHalfUsers].filter(u => secondHalfUsers.has(u)));
  const retentionRate = firstHalfUsers.size > 0 ? (retainedUsers.size / firstHalfUsers.size) * 100 : 0;

  return {
    totalUsers: allUsers.size,
    voiceEnabledUsers: voiceEnabledUsers.size,
    adoptionRate: allUsers.size > 0 ? (voiceEnabledUsers.size / allUsers.size) * 100 : 0,
    newAdoptersThisPeriod: newAdopters.size,
    averageSessionsPerUser: Math.round(averageSessionsPerUser * 100) / 100,
    retentionRate: Math.round(retentionRate * 100) / 100
  };
}

/**
 * Gets speech recognition accuracy metrics
 * 
 * @param {Date} startDate - Start date for metrics
 * @param {Date} endDate - End date for metrics
 * @returns {Promise<ISpeechRecognitionMetrics>} Speech recognition metrics
 */
export async function getSpeechRecognitionMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<ISpeechRecognitionMetrics> {
  const now = new Date();
  const defaultStartDate = startDate || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const defaultEndDate = endDate || now;

  const periodEvents = voiceAnalyticsStore.filter(event => 
    event.timestamp >= defaultStartDate && event.timestamp <= defaultEndDate
  );

  const speechAttempts = periodEvents.filter(e => e.event === 'speech_attempt');
  const speechSuccesses = periodEvents.filter(e => e.event === 'speech_success');
  const speechErrors = periodEvents.filter(e => e.event === 'speech_error');

  // Calculate accuracy rate
  const accuracyRate = speechAttempts.length > 0 
    ? (speechSuccesses.length / speechAttempts.length) * 100 
    : 0;

  // Calculate average confidence score
  const confidenceScores = speechSuccesses
    .map(e => e.data?.confidence)
    .filter(score => typeof score === 'number' && score >= 0 && score <= 1);
  
  const averageConfidenceScore = confidenceScores.length > 0
    ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
    : 0;

  // Group errors by type
  const errorsByType: Record<string, number> = {};
  speechErrors.forEach(e => {
    const errorType = e.data?.error?.errorType || 'unknown';
    errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
  });

  // Calculate average processing time
  const processingTimes = speechSuccesses
    .map(e => e.data?.processingTime)
    .filter(time => typeof time === 'number' && time > 0);
  
  const averageProcessingTime = processingTimes.length > 0
    ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
    : 0;

  // Calculate accuracy rates by browser
  const browserAccuracyRates: Record<string, number> = {};
  const browserStats = new Map<string, { attempts: number; successes: number }>();

  [...speechAttempts, ...speechSuccesses].forEach(e => {
    if (e.browserInfo) {
      const browser = e.browserInfo.split(' ')[0] || 'unknown';
      if (!browserStats.has(browser)) {
        browserStats.set(browser, { attempts: 0, successes: 0 });
      }
      const stats = browserStats.get(browser)!;
      if (e.event === 'speech_attempt') {
        stats.attempts++;
      } else if (e.event === 'speech_success') {
        stats.successes++;
      }
    }
  });

  browserStats.forEach((stats, browser) => {
    browserAccuracyRates[browser] = stats.attempts > 0 
      ? (stats.successes / stats.attempts) * 100 
      : 0;
  });

  return {
    totalAttempts: speechAttempts.length,
    successfulAttempts: speechSuccesses.length,
    accuracyRate: Math.round(accuracyRate * 100) / 100,
    averageConfidenceScore: Math.round(averageConfidenceScore * 1000) / 1000,
    errorsByType,
    averageProcessingTime: Math.round(averageProcessingTime),
    browserAccuracyRates: Object.fromEntries(
      Object.entries(browserAccuracyRates).map(([browser, rate]) => [
        browser, 
        Math.round(rate * 100) / 100
      ])
    )
  };
}

/**
 * Gets user preference patterns
 * 
 * @returns {Promise<IUserPreferencePatterns>} User preference patterns
 */
export async function getUserPreferencePatterns(): Promise<IUserPreferencePatterns> {
  const preferences = Array.from(userVoicePreferences.values());

  // Analyze voice preferences
  const voiceNameCounts = new Map<string, number>();
  const speechRates: number[] = [];
  const speechVolumes: number[] = [];
  const voiceGenderCounts = new Map<string, number>();
  const autoPlayCounts = { enabled: 0, disabled: 0 };
  const languageCounts = new Map<string, number>();

  preferences.forEach(pref => {
    if (pref.selectedVoice) {
      voiceNameCounts.set(pref.selectedVoice, (voiceNameCounts.get(pref.selectedVoice) || 0) + 1);
    }
    if (typeof pref.speechRate === 'number') {
      speechRates.push(pref.speechRate);
    }
    if (typeof pref.speechVolume === 'number') {
      speechVolumes.push(pref.speechVolume);
    }
    if (pref.voiceGender) {
      voiceGenderCounts.set(pref.voiceGender, (voiceGenderCounts.get(pref.voiceGender) || 0) + 1);
    }
    if (typeof pref.autoPlayResponses === 'boolean') {
      if (pref.autoPlayResponses) {
        autoPlayCounts.enabled++;
      } else {
        autoPlayCounts.disabled++;
      }
    }
    if (pref.voiceLanguage) {
      languageCounts.set(pref.voiceLanguage, (languageCounts.get(pref.voiceLanguage) || 0) + 1);
    }
  });

  // Create most popular voices array
  const mostPopularVoices = Array.from(voiceNameCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([voiceName, usageCount]) => ({
      voiceName,
      usageCount,
      percentage: preferences.length > 0 ? (usageCount / preferences.length) * 100 : 0
    }));

  // Calculate averages
  const averageSpeechRate = speechRates.length > 0
    ? speechRates.reduce((sum, rate) => sum + rate, 0) / speechRates.length
    : 1.0;

  const averageSpeechVolume = speechVolumes.length > 0
    ? speechVolumes.reduce((sum, vol) => sum + vol, 0) / speechVolumes.length
    : 0.8;

  return {
    mostPopularVoices,
    averageSpeechRate: Math.round(averageSpeechRate * 100) / 100,
    averageSpeechVolume: Math.round(averageSpeechVolume * 100) / 100,
    preferredVoiceGender: Object.fromEntries(voiceGenderCounts),
    autoPlayPreference: autoPlayCounts,
    languageDistribution: Object.fromEntries(languageCounts)
  };
}

/**
 * Gets voice error metrics by browser/device
 * 
 * @param {Date} startDate - Start date for metrics
 * @param {Date} endDate - End date for metrics
 * @returns {Promise<IVoiceErrorMetrics>} Voice error metrics
 */
export async function getVoiceErrorMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<IVoiceErrorMetrics> {
  const now = new Date();
  const defaultStartDate = startDate || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const defaultEndDate = endDate || now;

  const periodErrors = voiceErrorLog.filter(error => 
    error.timestamp >= defaultStartDate && error.timestamp <= defaultEndDate
  );

  // Group errors by type
  const errorsByType: Record<string, number> = {};
  periodErrors.forEach(error => {
    errorsByType[error.errorType] = (errorsByType[error.errorType] || 0) + 1;
  });

  // Group errors by browser
  const errorsByBrowser: Record<string, number> = {};
  periodErrors.forEach(error => {
    const browser = error.browserInfo.split(' ')[0] || 'unknown';
    errorsByBrowser[browser] = (errorsByBrowser[browser] || 0) + 1;
  });

  // Group errors by device (extracted from browser info)
  const errorsByDevice: Record<string, number> = {};
  periodErrors.forEach(error => {
    let device = 'desktop';
    if (error.browserInfo.includes('Mobile')) {
      device = 'mobile';
    } else if (error.browserInfo.includes('Tablet')) {
      device = 'tablet';
    }
    errorsByDevice[device] = (errorsByDevice[device] || 0) + 1;
  });

  // Create error trends (daily aggregation)
  const errorTrends: Array<{ date: Date; errorCount: number; errorType: string }> = [];
  const trendMap = new Map<string, Map<string, number>>();

  periodErrors.forEach(error => {
    const dateKey = error.timestamp.toISOString().split('T')[0];
    if (dateKey) {
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, new Map());
      }
      const dayMap = trendMap.get(dateKey)!;
      dayMap.set(error.errorType, (dayMap.get(error.errorType) || 0) + 1);
    }
  });

  trendMap.forEach((errorCounts, dateKey) => {
    errorCounts.forEach((count, errorType) => {
      errorTrends.push({
        date: new Date(dateKey),
        errorCount: count,
        errorType
      });
    });
  });

  // Calculate resolution rate
  const resolvedErrors = voiceErrorLog.filter(error => error.resolved).length;
  const resolutionRate = voiceErrorLog.length > 0 
    ? (resolvedErrors / voiceErrorLog.length) * 100 
    : 0;

  return {
    totalErrors: periodErrors.length,
    errorsByType,
    errorsByBrowser,
    errorsByDevice,
    errorTrends: errorTrends.sort((a, b) => a.date.getTime() - b.date.getTime()),
    resolutionRate: Math.round(resolutionRate * 100) / 100
  };
}

/**
 * Gets voice session performance metrics
 * 
 * @param {Date} startDate - Start date for metrics
 * @param {Date} endDate - End date for metrics
 * @returns {Promise<IVoiceSessionMetrics>} Voice session metrics
 */
export async function getVoiceSessionMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<IVoiceSessionMetrics> {
  const now = new Date();
  const defaultStartDate = startDate || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  const defaultEndDate = endDate || now;

  const periodEvents = voiceAnalyticsStore.filter(event => 
    event.timestamp >= defaultStartDate && event.timestamp <= defaultEndDate
  );

  const sessionStarts = periodEvents.filter(e => e.event === 'session_start');
  const sessionEnds = periodEvents.filter(e => e.event === 'session_end');
  const speechAttempts = periodEvents.filter(e => e.event === 'speech_attempt');

  // Calculate session durations
  const sessionDurations: number[] = [];
  sessionStarts.forEach(start => {
    const matchingEnd = sessionEnds.find(end => 
      end.userId === start.userId && 
      end.timestamp > start.timestamp &&
      end.timestamp.getTime() - start.timestamp.getTime() < 3600000 // within 1 hour
    );
    if (matchingEnd) {
      sessionDurations.push(matchingEnd.timestamp.getTime() - start.timestamp.getTime());
    }
  });

  const averageSessionDuration = sessionDurations.length > 0
    ? sessionDurations.reduce((sum, duration) => sum + duration, 0) / sessionDurations.length
    : 0;

  // Calculate average voice interactions per session
  const voiceInteractionsPerSession: number[] = [];
  sessionStarts.forEach(start => {
    const sessionInteractions = speechAttempts.filter(attempt =>
      attempt.userId === start.userId &&
      attempt.timestamp >= start.timestamp &&
      attempt.timestamp.getTime() - start.timestamp.getTime() < 3600000 // within 1 hour
    );
    voiceInteractionsPerSession.push(sessionInteractions.length);
  });

  const averageVoiceInteractions = voiceInteractionsPerSession.length > 0
    ? voiceInteractionsPerSession.reduce((sum, count) => sum + count, 0) / voiceInteractionsPerSession.length
    : 0;

  // Calculate completion rate
  const sessionCompletionRate = sessionStarts.length > 0
    ? (sessionEnds.length / sessionStarts.length) * 100
    : 0;

  // Performance by browser
  const performanceByBrowser: Record<string, any> = {};
  const browserSessionMap = new Map<string, { sessions: any[]; durations: number[] }>();

  sessionStarts.forEach(start => {
    if (start.browserInfo) {
      const browser = start.browserInfo.split(' ')[0] || 'unknown';
      if (!browserSessionMap.has(browser)) {
        browserSessionMap.set(browser, { sessions: [], durations: [] });
      }
      browserSessionMap.get(browser)!.sessions.push(start);
    }
  });

  sessionDurations.forEach((duration, index) => {
    const start = sessionStarts[index];
    if (start?.browserInfo) {
      const browser = start.browserInfo.split(' ')[0] || 'unknown';
      if (browserSessionMap.has(browser)) {
        browserSessionMap.get(browser)!.durations.push(duration);
      }
    }
  });

  browserSessionMap.forEach((data, browser) => {
    const avgDuration = data.durations.length > 0
      ? data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length
      : 0;
    
    performanceByBrowser[browser] = {
      sessionCount: data.sessions.length,
      averageDuration: Math.round(avgDuration),
      completionRate: Math.round((data.durations.length / data.sessions.length) * 100)
    };
  });

  // Device performance (simplified)
  const devicePerformance: Record<string, any> = {
    desktop: { sessionCount: 0, averageLatency: 0, errorRate: 0 },
    mobile: { sessionCount: 0, averageLatency: 0, errorRate: 0 },
    tablet: { sessionCount: 0, averageLatency: 0, errorRate: 0 }
  };

  sessionStarts.forEach(start => {
    let device = 'desktop';
    if (start.browserInfo?.includes('Mobile')) {
      device = 'mobile';
    } else if (start.browserInfo?.includes('Tablet')) {
      device = 'tablet';
    }
    devicePerformance[device].sessionCount++;
  });

  return {
    totalSessions: sessionStarts.length,
    averageSessionDuration: Math.round(averageSessionDuration),
    averageVoiceInteractions: Math.round(averageVoiceInteractions * 100) / 100,
    sessionCompletionRate: Math.round(sessionCompletionRate * 100) / 100,
    performanceByBrowser,
    devicePerformance
  };
}

/**
 * Gets time-based voice analytics
 * 
 * @param {string} period - Time period ('hour', 'day', 'week', 'month')
 * @param {number} count - Number of periods to retrieve
 * @returns {Promise<IVoiceTimeBasedAnalytics>} Time-based analytics
 */
export async function getVoiceTimeBasedAnalytics(
  period: 'hour' | 'day' | 'week' | 'month',
  count: number = 7
): Promise<IVoiceTimeBasedAnalytics> {
  const now = new Date();
  const data: IVoiceTimeBasedAnalytics['data'] = [];
  
  // Calculate milliseconds per period
  const periodMs = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000
  };
  
  for (let i = count - 1; i >= 0; i--) {
    const startTime = new Date(now.getTime() - (i + 1) * periodMs[period]);
    const endTime = new Date(now.getTime() - i * periodMs[period]);
    
    const periodEvents = voiceAnalyticsStore.filter(event => 
      event.timestamp >= startTime && event.timestamp < endTime
    );
    
    const voiceSessions = periodEvents.filter(e => e.event === 'session_start').length;
    const speechAttempts = periodEvents.filter(e => e.event === 'speech_attempt').length;
    const speechSuccesses = periodEvents.filter(e => e.event === 'speech_success').length;
    const errors = periodEvents.filter(e => e.event === 'speech_error').length;
    const uniqueUsers = new Set(periodEvents.map(e => e.userId)).size;
    
    data.push({
      timestamp: endTime,
      voiceSessions,
      speechAttempts,
      speechSuccesses,
      errors,
      uniqueUsers
    });
  }
  
  return {
    period,
    data
  };
}

/**
 * Gets comprehensive voice analytics dashboard summary
 * 
 * @returns {Promise<IVoiceAnalyticsSummary>} Voice analytics summary
 */
export async function getVoiceAnalyticsSummary(): Promise<IVoiceAnalyticsSummary> {
  const [
    adoption,
    speechRecognition,
    preferences,
    errors,
    sessions,
    recentActivity
  ] = await Promise.all([
    getVoiceAdoptionMetrics(),
    getSpeechRecognitionMetrics(),
    getUserPreferencePatterns(),
    getVoiceErrorMetrics(),
    getVoiceSessionMetrics(),
    getVoiceTimeBasedAnalytics('day', 7)
  ]);

  return {
    adoption,
    speechRecognition,
    preferences,
    errors,
    sessions,
    recentActivity
  };
}

/**
 * Marks a voice error as resolved
 * 
 * @param {string} errorId - Error ID or identifier
 * @param {string} resolution - Resolution description
 */
export function markVoiceErrorResolved(errorId: string, resolution: string): void {
  // In a real implementation, this would update the error in the database
  // For now, we'll mark errors as resolved based on timestamp
  const now = new Date();
  voiceErrorLog.forEach(error => {
    if (!error.resolved && now.getTime() - error.timestamp.getTime() > 24 * 60 * 60 * 1000) {
      error.resolved = true;
    }
  });

  console.log('[VOICE ANALYTICS] Error marked as resolved:', { errorId, resolution, timestamp: now });
}

/**
 * Exports voice analytics data for external analysis
 * 
 * @param {Date} startDate - Start date for export
 * @param {Date} endDate - End date for export
 * @returns {Promise<Object>} Anonymized analytics data
 */
export async function exportVoiceAnalytics(
  startDate?: Date,
  endDate?: Date
): Promise<{
  summary: IVoiceAnalyticsSummary;
  rawEvents: any[];
  anonymizedUserData: any[];
}> {
  const now = new Date();
  const defaultStartDate = startDate || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const defaultEndDate = endDate || now;

  const summary = await getVoiceAnalyticsSummary();
  
  // Filter and anonymize raw events
  const rawEvents = voiceAnalyticsStore
    .filter(event => event.timestamp >= defaultStartDate && event.timestamp <= defaultEndDate)
    .map(event => ({
      timestamp: event.timestamp,
      event: event.event,
      anonymizedUserId: Buffer.from(event.userId).toString('base64').substring(0, 8),
      browserInfo: event.browserInfo,
      deviceInfo: event.deviceInfo,
      // Remove any sensitive data
      data: event.data ? {
        ...event.data,
        userId: undefined,
        personalInfo: undefined
      } : undefined
    }));

  // Anonymize user preferences data
  const anonymizedUserData = Array.from(userVoicePreferences.entries()).map(([userId, prefs]) => ({
    anonymizedUserId: Buffer.from(userId).toString('base64').substring(0, 8),
    preferences: {
      ...prefs,
      userId: undefined,
      personalInfo: undefined
    }
  }));

  return {
    summary,
    rawEvents,
    anonymizedUserData
  };
}