import { getColorVariables, applyColorScheme } from './colors';

describe('Color System', () => {
  it('should provide correct light mode colors', () => {
    const lightColors = getColorVariables('light');
    
    // Brand colors from the guide
    expect(lightColors['--color-blue']).toBe('#2563eb'); // Blue
    expect(lightColors['--color-purple']).toBe('#9333ea'); // Purple
    expect(lightColors['--color-red']).toBe('#dc2626'); // Red
    expect(lightColors['--color-gold']).toBe('#d97706'); // Gold
    expect(lightColors['--color-green']).toBe('#059669'); // Green
  });

  it('should provide correct dark mode colors with desaturated variants', () => {
    const darkColors = getColorVariables('dark');
    
    // Desaturated variants for better visibility on dark backgrounds
    expect(darkColors['--color-blue']).toBe('#60a5fa'); // Lighter blue
    expect(darkColors['--color-purple']).toBe('#a855f7'); // Lighter purple
    expect(darkColors['--color-red']).toBe('#ef4444'); // Lighter red
    expect(darkColors['--color-gold']).toBe('#f59e0b'); // Lighter gold
    expect(darkColors['--color-green']).toBe('#10b981'); // Lighter green
  });

  it('should apply color scheme to document root', () => {
    // Mock document.documentElement.style
    const mockStyle = {};
    Object.defineProperty(document.documentElement, 'style', {
      value: {
        setProperty: jest.fn((prop, value) => {
          mockStyle[prop] = value;
        })
      }
    });

    applyColorScheme('light');

    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--color-blue', '#2563eb'
    );
    expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
      '--color-purple', '#9333ea'
    );
  });
});