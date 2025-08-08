// Color system based on the design guide
// Light mode: bright, saturated colors
// Dark mode: same colors but desaturated for better visibility

const COLORS = {
  light: {
    // Primary brand colors - bright and saturated
    '--color-blue': '#2563eb',      // Blue primary
    '--color-purple': '#9333ea',    // Purple secondary  
    '--color-red': '#dc2626',       // Red for errors
    '--color-gold': '#d97706',      // Gold for warnings
    '--color-green': '#059669',     // Green for success
    
    // Semantic color mappings for light mode
    '--accent-primary': '#2563eb',
    '--accent-secondary': '#9333ea', 
    '--accent-success': '#059669',
    '--accent-warning': '#d97706',
    '--accent-error': '#dc2626',
  },
  dark: {
    // Desaturated variants for better visibility on dark backgrounds
    '--color-blue': '#60a5fa',      // Lighter blue
    '--color-purple': '#a855f7',    // Lighter purple
    '--color-red': '#ef4444',       // Lighter red
    '--color-gold': '#f59e0b',      // Lighter gold
    '--color-green': '#10b981',     // Lighter green
    
    // Semantic color mappings for dark mode
    '--accent-primary': '#60a5fa',
    '--accent-secondary': '#a855f7',
    '--accent-success': '#10b981', 
    '--accent-warning': '#f59e0b',
    '--accent-error': '#ef4444',
  }
};

export const getColorVariables = (theme) => {
  return COLORS[theme] || COLORS.light;
};

export const applyColorScheme = (theme) => {
  const colors = getColorVariables(theme);
  
  Object.entries(colors).forEach(([property, value]) => {
    document.documentElement.style.setProperty(property, value);
  });
};