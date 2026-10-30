import { TextStyle } from 'react-native';

export const colors = {
  background: '#F7F4EE', surface: '#FFFDF9', surfaceMuted: '#F0EBE3',
  text: '#292824', textSecondary: '#716D65', border: '#E5DFD5',
  primary: '#AD4C3A', primarySoft: '#F7E8E1', onPrimary: '#FFFFFF',
  success: '#356650', successSoft: '#E8F1E9', warning: '#8C5B18', warningSoft: '#FCF0D9',
  danger: '#AB3E32', dangerSoft: '#FBE8E4', overlay: 'rgba(35, 32, 27, 0.42)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radii = { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 } as const;
export const typography = {
  title: { fontSize: 28, lineHeight: 36, fontWeight: '600' },
  heading: { fontSize: 20, lineHeight: 28, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
} satisfies Record<string, TextStyle>;
