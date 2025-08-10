/**
 * Tests for AvatarService
 * 
 * Tests the behavior of the avatar loading and management service
 * following behavior-driven testing principles.
 */

/* eslint-env jest */

import { AvatarService } from './avatarService';
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';

// Mock Three.js GLTFLoader
jest.mock('three', () => {
  const actualThree = jest.requireActual('three');
  return {
    ...actualThree,
    GLTFLoader: jest.fn().mockImplementation(() => ({
      register: jest.fn(),
      loadAsync: jest.fn()
    }))
  };
});

// Mock VRM loader
jest.mock('@pixiv/three-vrm', () => ({
  VRM: jest.fn(),
  VRMLoaderPlugin: jest.fn()
}));

describe('Avatar Service', () => {
  let avatarService;
  let mockLoader;

  beforeEach(() => {
    avatarService = new AvatarService();
    mockLoader = avatarService.loader;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('when loading avatars', () => {
    it('should successfully load an avatar from URL', async () => {
      const mockVRM = {
        scene: {
          traverse: jest.fn((callback) => {
            callback({ frustumCulled: true });
          })
        }
      };
      const mockGLTF = {
        userData: { vrm: mockVRM }
      };

      mockLoader.loadAsync.mockResolvedValue(mockGLTF);

      const avatarUrl = '/avatars/test-avatar.glb';
      const result = await avatarService.loadAvatar(avatarUrl);

      expect(mockLoader.loadAsync).toHaveBeenCalledWith(avatarUrl);
      expect(result).toBe(mockVRM);
      expect(mockVRM.scene.traverse).toHaveBeenCalled();
    });

    it('should return cached avatar on subsequent loads', async () => {
      const mockVRM = {
        scene: {
          traverse: jest.fn()
        }
      };
      const mockGLTF = {
        userData: { vrm: mockVRM }
      };

      mockLoader.loadAsync.mockResolvedValue(mockGLTF);

      const avatarUrl = '/avatars/test-avatar.glb';
      
      // First load
      const firstResult = await avatarService.loadAvatar(avatarUrl);
      
      // Second load
      const secondResult = await avatarService.loadAvatar(avatarUrl);

      expect(mockLoader.loadAsync).toHaveBeenCalledTimes(1);
      expect(firstResult).toBe(secondResult);
    });

    it('should throw error when avatar fails to load', async () => {
      const loadError = new Error('Failed to fetch avatar');
      mockLoader.loadAsync.mockRejectedValue(loadError);

      const avatarUrl = '/avatars/invalid-avatar.glb';

      await expect(avatarService.loadAvatar(avatarUrl))
        .rejects.toThrow('Failed to fetch avatar');
    });

    it('should disable frustum culling on all avatar objects', async () => {
      const mockObjects = [
        { frustumCulled: true },
        { frustumCulled: true },
        { frustumCulled: true }
      ];
      const mockVRM = {
        scene: {
          traverse: jest.fn((callback) => {
            mockObjects.forEach(callback);
          })
        }
      };
      const mockGLTF = {
        userData: { vrm: mockVRM }
      };

      mockLoader.loadAsync.mockResolvedValue(mockGLTF);

      await avatarService.loadAvatar('/avatars/test.glb');

      mockObjects.forEach(obj => {
        expect(obj.frustumCulled).toBe(false);
      });
    });
  });

  describe('when switching avatars', () => {
    it('should load new avatar and update current avatar', async () => {
      const mockVRM = {
        scene: {
          traverse: jest.fn()
        }
      };
      const mockGLTF = {
        userData: { vrm: mockVRM }
      };

      mockLoader.loadAsync.mockResolvedValue(mockGLTF);

      const avatarUrl = '/avatars/new-avatar.glb';
      const result = await avatarService.switchAvatar(avatarUrl);

      expect(result).toBe(mockVRM);
      expect(avatarService.currentAvatar).toBe(mockVRM);
    });

    it('should use cached avatar when switching to previously loaded avatar', async () => {
      const mockVRM1 = {
        scene: { traverse: jest.fn() }
      };
      const mockVRM2 = {
        scene: { traverse: jest.fn() }
      };

      mockLoader.loadAsync
        .mockResolvedValueOnce({ userData: { vrm: mockVRM1 } })
        .mockResolvedValueOnce({ userData: { vrm: mockVRM2 } });

      // Load first avatar
      await avatarService.switchAvatar('/avatars/avatar1.glb');
      
      // Switch to second avatar
      await avatarService.switchAvatar('/avatars/avatar2.glb');
      
      // Switch back to first avatar (should use cache)
      await avatarService.switchAvatar('/avatars/avatar1.glb');

      expect(mockLoader.loadAsync).toHaveBeenCalledTimes(2);
      expect(avatarService.currentAvatar).toBe(mockVRM1);
    });
  });

  describe('when getting default avatar options', () => {
    it('should return array of predefined avatar options', () => {
      const options = avatarService.getDefaultAvatarOptions();

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);
      
      options.forEach(option => {
        expect(option).toHaveProperty('id');
        expect(option).toHaveProperty('name');
        expect(option).toHaveProperty('role');
        expect(option).toHaveProperty('url');
        expect(option).toHaveProperty('thumbnail');
        expect(option).toHaveProperty('personality');
      });
    });

    it('should include diverse avatar options', () => {
      const options = avatarService.getDefaultAvatarOptions();
      
      const ids = options.map(opt => opt.id);
      expect(ids).toContain('professional-female-1');
      expect(ids).toContain('professional-male-1');
      expect(ids).toContain('professional-female-2');
    });

    it('should have valid avatar URLs and thumbnails', () => {
      const options = avatarService.getDefaultAvatarOptions();
      
      options.forEach(option => {
        expect(option.url).toMatch(/^\/avatars\/.*\.glb$/);
        expect(option.thumbnail).toMatch(/^\/avatars\/.*\.(jpg|png)$/);
      });
    });

    it('should have appropriate personality types', () => {
      const options = avatarService.getDefaultAvatarOptions();
      const validPersonalities = ['warm-professional', 'academic-formal', 'friendly-encouraging'];
      
      options.forEach(option => {
        expect(validPersonalities).toContain(option.personality);
      });
    });
  });

  describe('initialization', () => {
    it('should register VRM loader plugin on construction', () => {
      const service = new AvatarService();
      
      expect(THREE.GLTFLoader).toHaveBeenCalled();
      expect(service.loader.register).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should initialize with empty avatar cache', () => {
      const service = new AvatarService();
      
      expect(service.avatarCache).toBeInstanceOf(Map);
      expect(service.avatarCache.size).toBe(0);
    });

    it('should initialize with no current avatar', () => {
      const service = new AvatarService();
      
      expect(service.currentAvatar).toBeNull();
    });
  });
});