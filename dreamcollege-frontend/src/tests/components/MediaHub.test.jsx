import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext';
import MediaHub from '../../components/MediaHub';

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider>
      {component}
    </ThemeProvider>
  );
};

describe('Media Hub', () => {
  it('should display the Media Hub header', () => {
    renderWithTheme(<MediaHub />);
    
    const heading = screen.getByText('Media Hub');
    expect(heading).toBeInTheDocument();
  });

  it('should display a placeholder for future video content', () => {
    renderWithTheme(<MediaHub />);
    
    const videoPlaceholder = screen.getByText(/coming soon/i);
    expect(videoPlaceholder).toBeInTheDocument();
  });
});