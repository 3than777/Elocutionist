/**
 * Avatar Service
 * 
 * Handles loading, caching, and management of 3D avatars for the interview system.
 * Supports VRM format avatars with Three.js integration.
 */

import * as THREE from 'three';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';

export class AvatarService {
  constructor() {
    this.avatarCache = new Map();
    this.currentAvatar = null;
    this.loader = new THREE.GLTFLoader();
    this.loader.register((parser) => new VRMLoaderPlugin(parser));
  }

  async loadAvatar(avatarUrl) {
    if (this.avatarCache.has(avatarUrl)) {
      return this.avatarCache.get(avatarUrl);
    }

    try {
      const gltf = await this.loader.loadAsync(avatarUrl);
      const vrm = gltf.userData.vrm;
      
      // Setup avatar
      vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
      });

      this.avatarCache.set(avatarUrl, vrm);
      return vrm;
    } catch (error) {
      console.error('Failed to load avatar:', error);
      throw error;
    }
  }

  async switchAvatar(avatarUrl) {
    const avatar = await this.loadAvatar(avatarUrl);
    this.currentAvatar = avatar;
    return avatar;
  }

  getDefaultAvatarOptions() {
    return [
      {
        id: 'professional-female-1',
        name: 'Sarah Chen',
        role: 'Senior Admissions Officer',
        url: '/avatars/sarah-chen.glb',
        thumbnail: '/avatars/sarah-chen-thumb.jpg',
        personality: 'warm-professional'
      },
      {
        id: 'professional-male-1',
        name: 'Dr. James Williams',
        role: 'Dean of Admissions',
        url: '/avatars/james-williams.glb',
        thumbnail: '/avatars/james-williams-thumb.jpg',
        personality: 'academic-formal'
      },
      {
        id: 'professional-female-2',
        name: 'Maria Rodriguez',
        role: 'Interview Coordinator',
        url: '/avatars/maria-rodriguez.glb',
        thumbnail: '/avatars/maria-rodriguez-thumb.jpg',
        personality: 'friendly-encouraging'
      }
    ];
  }
}