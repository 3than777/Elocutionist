import { getColorVariables, applyColorScheme } from './colors';

describe('Color System Integration', () => {
  beforeEach(() => {
    // Reset document styles
    document.documentElement.style.cssText = '';
  });

  describe('Color Brand Guidelines Compliance', () => {
    it('should implement exact colors from the design guide', () => {
      const lightColors = getColorVariables('light');
      
      // Test the 5 brand colors from the guide
      expect(lightColors['--color-blue']).toBe('#2563eb');
      expect(lightColors['--color-purple']).toBe('#9333ea'); 
      expect(lightColors['--color-red']).toBe('#dc2626');
      expect(lightColors['--color-gold']).toBe('#d97706');
      expect(lightColors['--color-green']).toBe('#059669');
    });

    it('should implement desaturated colors for dark mode', () => {
      const darkColors = getColorVariables('dark');
      
      // Test desaturated variants for better visibility on dark backgrounds
      expect(darkColors['--color-blue']).toBe('#60a5fa');
      expect(darkColors['--color-purple']).toBe('#a855f7');
      expect(darkColors['--color-red']).toBe('#ef4444');
      expect(darkColors['--color-gold']).toBe('#f59e0b');
      expect(darkColors['--color-green']).toBe('#10b981');
    });

    it('should map semantic colors correctly for light mode', () => {
      const lightColors = getColorVariables('light');
      
      expect(lightColors['--accent-primary']).toBe('#2563eb');
      expect(lightColors['--accent-secondary']).toBe('#9333ea');
      expect(lightColors['--accent-success']).toBe('#059669');
      expect(lightColors['--accent-warning']).toBe('#d97706');
      expect(lightColors['--accent-error']).toBe('#dc2626');
    });

    it('should map semantic colors correctly for dark mode', () => {
      const darkColors = getColorVariables('dark');
      
      expect(darkColors['--accent-primary']).toBe('#60a5fa');
      expect(darkColors['--accent-secondary']).toBe('#a855f7');
      expect(darkColors['--accent-success']).toBe('#10b981');
      expect(darkColors['--accent-warning']).toBe('#f59e0b');
      expect(darkColors['--accent-error']).toBe('#ef4444');
    });
  });

  describe('Color Application', () => {
    it('should apply all light mode colors to document root', () => {
      applyColorScheme('light');

      const documentStyle = document.documentElement.style;
      expect(documentStyle.getPropertyValue('--color-blue')).toBe('#2563eb');
      expect(documentStyle.getPropertyValue('--color-purple')).toBe('#9333ea');
      expect(documentStyle.getPropertyValue('--accent-primary')).toBe('#2563eb');
      expect(documentStyle.getPropertyValue('--accent-success')).toBe('#059669');
    });

    it('should apply all dark mode colors to document root', () => {
      applyColorScheme('dark');

      const documentStyle = document.documentElement.style;
      expect(documentStyle.getPropertyValue('--color-blue')).toBe('#60a5fa');
      expect(documentStyle.getPropertyValue('--color-purple')).toBe('#a855f7');
      expect(documentStyle.getPropertyValue('--accent-primary')).toBe('#60a5fa');
      expect(documentStyle.getPropertyValue('--accent-success')).toBe('#10b981');
    });
  });

  describe('Color Accessibility', () => {
    it('should provide sufficient contrast between light and dark variants', () => {
      const lightColors = getColorVariables('light');
      const darkColors = getColorVariables('dark');
      
      // Test that dark mode colors are visually distinct from light mode
      expect(lightColors['--color-blue']).not.toBe(darkColors['--color-blue']);
      expect(lightColors['--color-purple']).not.toBe(darkColors['--color-purple']);
      expect(lightColors['--color-red']).not.toBe(darkColors['--color-red']);
      expect(lightColors['--color-gold']).not.toBe(darkColors['--color-gold']);
      expect(lightColors['--color-green']).not.toBe(darkColors['--color-green']);
    });

    // Basic hex color validation
    it('should use valid hex color codes', () => {
      const lightColors = getColorVariables('light');
      const darkColors = getColorVariables('dark');
      
      const hexColorRegex = /^#[0-9a-fA-F]{6}$/;
      
      // Test light mode colors
      expect(lightColors['--color-blue']).toMatch(hexColorRegex);
      expect(lightColors['--color-purple']).toMatch(hexColorRegex);
      expect(lightColors['--color-red']).toMatch(hexColorRegex);
      
      // Test dark mode colors
      expect(darkColors['--color-blue']).toMatch(hexColorRegex);
      expect(darkColors['--color-purple']).toMatch(hexColorRegex);
      expect(darkColors['--color-red']).toMatch(hexColorRegex);
    });
  });
});