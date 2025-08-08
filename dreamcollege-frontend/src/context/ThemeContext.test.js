import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';
import * as colors from '../utils/colors';

// Mock the colors module
jest.mock('../utils/colors');

// Test component to use the theme context
const TestComponent = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="is-dark">{isDark.toString()}</span>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

describe('ThemeContext', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    // Clear mocks
    jest.clearAllMocks();
  });

  it('should initialize with light theme by default', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(getByTestId('current-theme')).toHaveTextContent('light');
    expect(getByTestId('is-dark')).toHaveTextContent('false');
    expect(colors.applyColorScheme).toHaveBeenCalledWith('light');
  });

  it('should toggle between light and dark themes', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = getByTestId('toggle-theme');
    
    // Toggle to dark
    fireEvent.click(toggleButton);
    expect(getByTestId('current-theme')).toHaveTextContent('dark');
    expect(getByTestId('is-dark')).toHaveTextContent('true');
    expect(colors.applyColorScheme).toHaveBeenCalledWith('dark');

    // Toggle back to light
    fireEvent.click(toggleButton);
    expect(getByTestId('current-theme')).toHaveTextContent('light');
    expect(getByTestId('is-dark')).toHaveTextContent('false');
    expect(colors.applyColorScheme).toHaveBeenCalledWith('light');
  });

  it('should apply color scheme when theme changes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    // Should apply light theme colors on mount
    expect(colors.applyColorScheme).toHaveBeenCalledWith('light');
  });

  it('should persist theme preference in localStorage', () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const toggleButton = getByTestId('toggle-theme');
    fireEvent.click(toggleButton);

    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('should load saved theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(getByTestId('current-theme')).toHaveTextContent('dark');
    expect(getByTestId('is-dark')).toHaveTextContent('true');
    expect(colors.applyColorScheme).toHaveBeenCalledWith('dark');
  });
});