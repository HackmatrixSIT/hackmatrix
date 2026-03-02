/**
 * NervSync Professional Design System
 * Focus: Bioluminescence, Glassmorphism, and Fluid Movement.
 */

export const THEME = {
  colors: {
    // States
    calm: {
      primary: '#008080', // Deep Teal
      secondary: '#00FFFF', // Cyan Glow
      background: ['#001A1A', '#003333'], // Deep Dark Gradient
    },
    stress: {
      primary: '#FF8C00', // Dark Orange
      secondary: '#FFD700', // Gold
      background: ['#1A0F00', '#331E00'],
    },
    agitation: {
      primary: '#DC143C', // Crimson
      secondary: '#FF00FF', // Magenta
      background: ['#1A0000', '#330000'],
    },
    // General
    white: '#FFFFFF',
    glass: 'rgba(255, 255, 255, 0.1)',
    glassBorder: 'rgba(255, 255, 255, 0.2)',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    s: 8,
    m: 16,
    l: 24,
    full: 9999,
  }
};

export const Fonts = {
  rounded: 'System',
  mono: 'SpaceMono',
};

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
  },
};
