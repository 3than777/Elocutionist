/**
 * Tests for AvatarControls Component
 * 
 * Tests the behavior of avatar control UI including
 * avatar selection, quality settings, and camera controls.
 */

/* eslint-env jest */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarControls from './AvatarControls';

// Mock the avatar service
jest.mock('../services/avatarService', () => ({
  AvatarService: jest.fn().mockImplementation(() => ({
    getDefaultAvatarOptions: jest.fn().mockReturnValue([
      {
        id: 'professional-female-1',
        name: 'Sarah Chen',
        role: 'Senior Admissions Officer',
        thumbnail: '/avatars/sarah-chen-thumb.jpg'
      },
      {
        id: 'professional-male-1',
        name: 'Dr. James Williams',
        role: 'Dean of Admissions',
        thumbnail: '/avatars/james-williams-thumb.jpg'
      },
      {
        id: 'professional-female-2',
        name: 'Maria Rodriguez',
        role: 'Interview Coordinator',
        thumbnail: '/avatars/maria-rodriguez-thumb.jpg'
      }
    ])
  }))
}));

describe('AvatarControls Component', () => {
  const defaultProps = {
    show: true,
    onToggle: jest.fn(),
    selectedAvatar: 'professional-female-1',
    onAvatarChange: jest.fn(),
    animationQuality: 'high',
    onQualityChange: jest.fn(),
    cameraPosition: [0, 1.6, 2.5],
    onCameraChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('visibility', () => {
    it('should render controls when show is true', () => {
      render(<AvatarControls {...defaultProps} show={true} />);
      
      expect(screen.getByText('Avatar Settings')).toBeInTheDocument();
    });

    it('should hide controls when show is false', () => {
      render(<AvatarControls {...defaultProps} show={false} />);
      
      expect(screen.queryByText('Avatar Settings')).not.toBeInTheDocument();
    });

    it('should toggle visibility when toggle button is clicked', () => {
      const onToggle = jest.fn();
      render(<AvatarControls {...defaultProps} onToggle={onToggle} />);
      
      const toggleButton = screen.getByLabelText('Toggle avatar controls');
      fireEvent.click(toggleButton);
      
      expect(onToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('avatar selection', () => {
    it('should display available avatar options', () => {
      render(<AvatarControls {...defaultProps} />);
      
      expect(screen.getByText('Sarah Chen')).toBeInTheDocument();
      expect(screen.getByText('Dr. James Williams')).toBeInTheDocument();
      expect(screen.getByText('Maria Rodriguez')).toBeInTheDocument();
    });

    it('should highlight selected avatar', () => {
      render(<AvatarControls {...defaultProps} selectedAvatar="professional-female-1" />);
      
      const selectedOption = screen.getByTestId('avatar-option-professional-female-1');
      expect(selectedOption).toHaveClass('selected');
    });

    it('should call onAvatarChange when avatar is selected', () => {
      const onAvatarChange = jest.fn();
      render(<AvatarControls {...defaultProps} onAvatarChange={onAvatarChange} />);
      
      const avatarOption = screen.getByTestId('avatar-option-professional-male-1');
      fireEvent.click(avatarOption);
      
      expect(onAvatarChange).toHaveBeenCalledWith('professional-male-1');
    });

    it('should display avatar thumbnails', () => {
      render(<AvatarControls {...defaultProps} />);
      
      const thumbnails = screen.getAllByRole('img');
      expect(thumbnails).toHaveLength(3);
      expect(thumbnails[0]).toHaveAttribute('src', '/avatars/sarah-chen-thumb.jpg');
    });

    it('should display avatar roles', () => {
      render(<AvatarControls {...defaultProps} />);
      
      expect(screen.getByText('Senior Admissions Officer')).toBeInTheDocument();
      expect(screen.getByText('Dean of Admissions')).toBeInTheDocument();
      expect(screen.getByText('Interview Coordinator')).toBeInTheDocument();
    });
  });

  describe('quality settings', () => {
    it('should display quality options', () => {
      render(<AvatarControls {...defaultProps} />);
      
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('should highlight current quality setting', () => {
      render(<AvatarControls {...defaultProps} animationQuality="medium" />);
      
      const mediumOption = screen.getByTestId('quality-option-medium');
      expect(mediumOption).toHaveClass('selected');
    });

    it('should call onQualityChange when quality is changed', () => {
      const onQualityChange = jest.fn();
      render(<AvatarControls {...defaultProps} onQualityChange={onQualityChange} />);
      
      const lowQualityOption = screen.getByTestId('quality-option-low');
      fireEvent.click(lowQualityOption);
      
      expect(onQualityChange).toHaveBeenCalledWith('low');
    });

    it('should display quality descriptions', () => {
      render(<AvatarControls {...defaultProps} />);
      
      expect(screen.getByText(/All features enabled/)).toBeInTheDocument();
      expect(screen.getByText(/Balanced performance/)).toBeInTheDocument();
      expect(screen.getByText(/Best for older devices/)).toBeInTheDocument();
    });
  });

  describe('camera controls', () => {
    it('should display camera presets', () => {
      render(<AvatarControls {...defaultProps} />);
      
      expect(screen.getByText('Front View')).toBeInTheDocument();
      expect(screen.getByText('Side View')).toBeInTheDocument();
      expect(screen.getByText('Dynamic')).toBeInTheDocument();
    });

    it('should call onCameraChange when preset is selected', () => {
      const onCameraChange = jest.fn();
      render(<AvatarControls {...defaultProps} onCameraChange={onCameraChange} />);
      
      const sideViewButton = screen.getByText('Side View');
      fireEvent.click(sideViewButton);
      
      expect(onCameraChange).toHaveBeenCalledWith([2.5, 1.6, 0]);
    });

    it('should display manual camera controls', () => {
      render(<AvatarControls {...defaultProps} />);
      
      expect(screen.getByLabelText('Camera X')).toBeInTheDocument();
      expect(screen.getByLabelText('Camera Y')).toBeInTheDocument();
      expect(screen.getByLabelText('Camera Z')).toBeInTheDocument();
    });

    it('should update camera position on slider change', () => {
      const onCameraChange = jest.fn();
      render(<AvatarControls {...defaultProps} onCameraChange={onCameraChange} />);
      
      const xSlider = screen.getByLabelText('Camera X');
      fireEvent.change(xSlider, { target: { value: '1.5' } });
      
      expect(onCameraChange).toHaveBeenCalledWith([1.5, 1.6, 2.5]);
    });
  });

  describe('UI styling', () => {
    it('should have proper container styling', () => {
      render(<AvatarControls {...defaultProps} />);
      
      const container = screen.getByTestId('avatar-controls-container');
      expect(container).toHaveStyle({
        position: 'absolute',
        pointerEvents: 'auto'
      });
    });

    it('should display section headers', () => {
      render(<AvatarControls {...defaultProps} />);
      
      expect(screen.getByText('Choose Your Interviewer')).toBeInTheDocument();
      expect(screen.getByText('Animation Quality')).toBeInTheDocument();
      expect(screen.getByText('Camera Position')).toBeInTheDocument();
    });

    it('should have toggle button with icon', () => {
      render(<AvatarControls {...defaultProps} />);
      
      const toggleButton = screen.getByLabelText('Toggle avatar controls');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('keyboard accessibility', () => {
    it('should allow keyboard navigation between avatars', () => {
      render(<AvatarControls {...defaultProps} />);
      
      const avatarOptions = screen.getAllByRole('button', { name: /Select.*avatar/ });
      
      avatarOptions[0].focus();
      expect(document.activeElement).toBe(avatarOptions[0]);
      
      // Tab to next option
      fireEvent.keyDown(avatarOptions[0], { key: 'Tab' });
    });

    it('should support Enter key for selection', () => {
      const onAvatarChange = jest.fn();
      render(<AvatarControls {...defaultProps} onAvatarChange={onAvatarChange} />);
      
      const avatarOption = screen.getByTestId('avatar-option-professional-male-1');
      avatarOption.focus();
      fireEvent.keyDown(avatarOption, { key: 'Enter' });
      
      expect(onAvatarChange).toHaveBeenCalledWith('professional-male-1');
    });
  });
});