// Mobile responsive utilities and helpers

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export const useIsMobile = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoints.md;
};

export const useIsTablet = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= breakpoints.md && window.innerWidth < breakpoints.lg;
};

export const useIsDesktop = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= breakpoints.lg;
};

// Touch-friendly sizes
export const touchSizes = {
  minTouchTarget: 'min-h-[44px] min-w-[44px]', // iOS minimum recommended
  button: 'h-12 px-6', // 48px height
  icon: 'h-10 w-10', // 40px
  smallButton: 'h-10 px-4', // 40px height
  largeButton: 'h-14 px-8', // 56px height
} as const;

// Spacing for mobile
export const mobileSpacing = {
  screenPadding: 'px-4 sm:px-6 lg:px-8',
  sectionGap: 'space-y-4 sm:space-y-6 lg:space-y-8',
  cardPadding: 'p-4 sm:p-6',
  headerHeight: 'h-14 sm:h-16',
} as const;

// Typography scales
export const responsiveText = {
  h1: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
  h2: 'text-xl sm:text-2xl lg:text-3xl font-bold',
  h3: 'text-lg sm:text-xl lg:text-2xl font-semibold',
  h4: 'text-base sm:text-lg lg:text-xl font-semibold',
  body: 'text-sm sm:text-base',
  small: 'text-xs sm:text-sm',
} as const;

// Grid layouts
export const responsiveGrid = {
  cards: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
  twoCol: 'grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6',
  threeCol: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  autoFit: 'grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4',
} as const;

// Container classes
export const container = {
  full: 'w-full min-h-screen',
  centered: 'w-full max-w-7xl mx-auto',
  content: 'w-full max-w-4xl mx-auto',
  narrow: 'w-full max-w-2xl mx-auto',
} as const;

// Safe areas for notches and system UI
export const safeArea = {
  top: 'pt-safe-top',
  bottom: 'pb-safe-bottom',
  left: 'pl-safe-left',
  right: 'pr-safe-right',
  all: 'p-safe',
} as const;
