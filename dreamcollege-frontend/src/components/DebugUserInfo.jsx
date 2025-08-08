import React from 'react';

export default function DebugUserInfo({ user }) {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');
  
  console.log('Debug User Info:');
  console.log('- User from props:', user);
  console.log('- Token from localStorage:', token);
  console.log('- User from localStorage:', storedUser);
  
  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser);
      console.log('- Parsed user ID:', parsedUser._id || parsedUser.id);
    } catch (e) {
      console.log('- Error parsing user:', e);
    }
  }
  
  return null; // This component doesn't render anything
}