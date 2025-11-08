

export const buttonVariants = {

  base: 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',


  size: {
    sm: 'h-8 px-3 text-sm rounded-md',
    md: 'h-10 px-4 text-base rounded-lg',
    lg: 'h-12 px-6 text-lg rounded-xl',
  },


  variant: {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus-visible:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 focus-visible:ring-gray-500',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950 focus-visible:ring-blue-500',
    ghost: 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950 focus-visible:ring-blue-500',
    destructive: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 focus-visible:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus-visible:ring-green-500',
    social: 'bg-white border border-border-light text-text-dark hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-700 focus-visible:ring-blue-500',
  },
} as const;

export const inputVariants = {

  base: 'flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500',


  size: {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-4 text-lg',
  },


  state: {
    default: 'border-gray-300 focus:ring-blue-500 dark:border-gray-700',
    error: 'border-red-500 focus:ring-red-500 dark:border-red-400',
    success: 'border-green-500 focus:ring-green-500 dark:border-green-400',
  },
} as const;

export const cardVariants = {

  base: 'rounded-lg border border-gray-200 bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100',


  size: {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  },


  elevation: {
    flat: 'shadow-none border-gray-200 dark:border-gray-700',
    low: 'shadow-sm border-gray-200 dark:border-gray-700',
    medium: 'shadow-md border-gray-100 dark:border-gray-700',
    high: 'shadow-lg border-gray-100 dark:border-gray-700',
  },
} as const;

export const containerVariants = {

  base: 'mx-auto w-full px-4',
  

  maxWidth: {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-none',
  },
} as const;

export const textVariants = {

  base: 'text-gray-900 dark:text-gray-100',


  size: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
  },


  weight: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },


  color: {
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-purple-600 dark:text-purple-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    error: 'text-red-600 dark:text-red-400',
    muted: 'text-gray-500 dark:text-gray-400',
    white: 'text-white',
  },
} as const;