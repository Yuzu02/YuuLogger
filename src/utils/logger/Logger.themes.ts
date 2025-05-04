/**
 * Logger themes with enhanced colors using the colors.js approach
 * This provides more variety and aesthetically pleasing color combinations
 * while maintaining readability and accessibility
 */

import {
  ILoggerTheme,
  IThemeHighlight,
  LoggerThemeRecord,
} from "../../interfaces/LoggerUtilities.interface";
import { LoggerTheme } from "../../interfaces/YuuLogger.interfaces";

// Extended color palette beyond basic ANSI - mimicking colors.js capabilities
export const colors = {
  // Basic reset and styles
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",
  underline: "\x1b[4m",
  inverse: "\x1b[7m",
  hidden: "\x1b[8m",
  strikethrough: "\x1b[9m",

  // Standard colors
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Bright colors
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",

  // Background colors
  bgBlack: "\x1b[40m",
  bgRed: "\x1b[41m",
  bgGreen: "\x1b[42m",
  bgYellow: "\x1b[43m",
  bgBlue: "\x1b[44m",
  bgMagenta: "\x1b[45m",
  bgCyan: "\x1b[46m",
  bgWhite: "\x1b[47m",
  bgGray: "\x1b[100m",
  bgBrightRed: "\x1b[101m",
  bgBrightGreen: "\x1b[102m",
  bgBrightYellow: "\x1b[103m",
  bgBrightBlue: "\x1b[104m",
  bgBrightMagenta: "\x1b[105m",
  bgBrightCyan: "\x1b[106m",
  bgBrightWhite: "\x1b[107m",

  // Extended color methods (mimicking colors.js) with curated hex colors
  // These use the 8-bit color mode (256 colors) with \x1b[38;5;{color_code}m
  navy: "\x1b[38;5;17m",
  darkblue: "\x1b[38;5;18m",
  mediumblue: "\x1b[38;5;20m",
  skyblue: "\x1b[38;5;39m",
  lightblue: "\x1b[38;5;45m",
  turquoise: "\x1b[38;5;43m",
  teal: "\x1b[38;5;30m",
  mint: "\x1b[38;5;121m",
  forest: "\x1b[38;5;22m",
  lime: "\x1b[38;5;46m",
  olive: "\x1b[38;5;58m",
  gold: "\x1b[38;5;178m",
  orange: "\x1b[38;5;214m",
  salmon: "\x1b[38;5;209m",
  crimson: "\x1b[38;5;160m",
  maroon: "\x1b[38;5;52m",
  pink: "\x1b[38;5;205m",
  hotpink: "\x1b[38;5;199m",
  fuchsia: "\x1b[38;5;201m",
  purple: "\x1b[38;5;93m",
  violet: "\x1b[38;5;99m",
  indigo: "\x1b[38;5;54m",
  lavender: "\x1b[38;5;183m",
  beige: "\x1b[38;5;187m",
  khaki: "\x1b[38;5;143m",
  tan: "\x1b[38;5;179m",
  brown: "\x1b[38;5;130m",
  silver: "\x1b[38;5;145m",
  steel: "\x1b[38;5;67m",
  slate: "\x1b[38;5;60m",

  // Extended background colors
  bgNavy: "\x1b[48;5;17m",
  bgTeal: "\x1b[48;5;30m",
  bgForest: "\x1b[48;5;22m",
  bgOlive: "\x1b[48;5;58m",
  bgOrange: "\x1b[48;5;214m",
  bgMaroon: "\x1b[48;5;52m",
  bgPurple: "\x1b[48;5;93m",
  bgIndigo: "\x1b[48;5;54m",
  bgSteel: "\x1b[48;5;67m",
  bgSlate: "\x1b[48;5;60m",
  bgTurquoise: "\x1b[48;5;43m",
  bgPink: "\x1b[48;5;205m",
  bgViolet: "\x1b[48;5;99m",
  bgSalmon: "\x1b[48;5;209m",
  bgCrimson: "\x1b[48;5;160m",
  bgMint: "\x1b[48;5;121m",
} as const;

/**
 * Color themes for the logger using the extended color palette
 * Each theme has a unique and harmonious color scheme
 */
export const loggerThemes: LoggerThemeRecord = {
  // Default theme with subtle improvements
  default: {
    appName: `${colors.bold}${colors.brightMagenta}`,
    pid: `${colors.dim}${colors.silver}`,
    timestamp: `${colors.dim}${colors.silver}`,
    context: `${colors.bold}${colors.yellow}`,
    level: {
      error: `${colors.bold}${colors.brightRed}`,
      warn: `${colors.bold}${colors.yellow}`,
      info: `${colors.bold}${colors.green}`,
      debug: `${colors.bold}${colors.brightBlue}`,
      verbose: `${colors.bold}${colors.cyan}`,
    },
    message: {
      error: colors.red,
      warn: colors.yellow,
      info: colors.brightWhite,
      debug: colors.brightWhite,
      verbose: colors.brightWhite,
    },
  },

  // Dark theme
  dark: {
    appName: `${colors.bold}${colors.brightMagenta}`,
    pid: `${colors.bold}${colors.gray}`,
    timestamp: `${colors.dim}${colors.brightCyan}`,
    context: `${colors.bold}${colors.brightYellow}`,
    level: {
      error: `${colors.bold}${colors.brightRed}`,
      warn: `${colors.bold}${colors.brightYellow}`,
      info: `${colors.bold}${colors.brightGreen}`,
      debug: `${colors.bold}${colors.brightBlue}`,
      verbose: `${colors.bold}${colors.brightCyan}`,
    },
    message: {
      error: colors.brightRed,
      warn: colors.brightYellow,
      info: colors.brightWhite,
      debug: colors.brightWhite,
      verbose: colors.brightWhite,
    },
  },

  // Pastel theme
  pastel: {
    appName: `${colors.bold}${colors.magenta}`,
    pid: `${colors.dim}${colors.cyan}`,
    timestamp: `${colors.dim}${colors.green}`,
    context: `${colors.bold}${colors.yellow}`,
    level: {
      error: `${colors.bold}${colors.red}`,
      warn: `${colors.bold}${colors.yellow}`,
      info: `${colors.bold}${colors.green}`,
      debug: `${colors.bold}${colors.blue}`,
      verbose: `${colors.bold}${colors.magenta}`,
    },
    message: {
      error: colors.red,
      warn: colors.yellow,
      info: colors.green,
      debug: colors.blue,
      verbose: colors.magenta,
    },
  },

  // Ocean theme
  ocean: {
    appName: `${colors.bold}${colors.white}${colors.bgNavy}`,
    pid: `${colors.dim}${colors.steel}`,
    timestamp: `${colors.dim}${colors.turquoise}`,
    context: `${colors.bold}${colors.skyblue}`,
    level: {
      error: `${colors.bold}${colors.crimson}`,
      warn: `${colors.bold}${colors.gold}`,
      info: `${colors.bold}${colors.lightblue}`,
      debug: `${colors.bold}${colors.mediumblue}`,
      verbose: `${colors.bold}${colors.teal}`,
    },
    message: {
      error: colors.salmon,
      warn: colors.gold,
      info: colors.skyblue,
      debug: colors.blue,
      verbose: colors.turquoise,
    },
  },

  // Sunset theme
  sunset: {
    appName: `${colors.bold}${colors.white}${colors.bgCrimson}`,
    pid: `${colors.dim}${colors.gold}`,
    timestamp: `${colors.dim}${colors.orange}`,
    context: `${colors.bold}${colors.salmon}`,
    level: {
      error: `${colors.bold}${colors.crimson}`,
      warn: `${colors.bold}${colors.orange}`,
      info: `${colors.bold}${colors.gold}`,
      debug: `${colors.bold}${colors.pink}`,
      verbose: `${colors.bold}${colors.fuchsia}`,
    },
    message: {
      error: colors.crimson,
      warn: colors.orange,
      info: colors.white,
      debug: colors.pink,
      verbose: colors.hotpink,
    },
  },

  // Forest theme
  forest: {
    appName: `${colors.bold}${colors.white}${colors.bgForest}`,
    pid: `${colors.dim}${colors.mint}`,
    timestamp: `${colors.dim}${colors.olive}`,
    context: `${colors.bold}${colors.lime}`,
    level: {
      error: `${colors.bold}${colors.crimson}`,
      warn: `${colors.bold}${colors.gold}`,
      info: `${colors.bold}${colors.brightGreen}`,
      debug: `${colors.bold}${colors.teal}`,
      verbose: `${colors.bold}${colors.turquoise}`,
    },
    message: {
      error: colors.crimson,
      warn: colors.gold,
      info: colors.mint,
      debug: colors.teal,
      verbose: colors.turquoise,
    },
  },

  // Cyberpunk theme
  cyberpunk: {
    appName: `${colors.bold}${colors.black}${colors.purple}`,
    pid: `${colors.dim}${colors.hotpink}`,
    timestamp: `${colors.dim}${colors.brightBlue}`,
    context: `${colors.bold}${colors.fuchsia}`,
    level: {
      error: `${colors.bold}${colors.crimson}`,
      warn: `${colors.bold}${colors.orange}`,
      info: `${colors.bold}${colors.brightCyan}`,
      debug: `${colors.bold}${colors.purple}`,
      verbose: `${colors.bold}${colors.turquoise}`,
    },
    message: {
      error: colors.brightRed,
      warn: colors.orange,
      info: colors.brightCyan,
      debug: colors.brightMagenta,
      verbose: colors.turquoise,
    },
  },

  // Coffee theme
  coffee: {
    appName: `${colors.bold}${colors.white}${colors.brown}`,
    pid: `${colors.dim}${colors.tan}`,
    timestamp: `${colors.dim}${colors.beige}`,
    context: `${colors.bold}${colors.khaki}`,
    level: {
      error: `${colors.bold}${colors.maroon}`,
      warn: `${colors.bold}${colors.gold}`,
      info: `${colors.bold}${colors.tan}`,
      debug: `${colors.bold}${colors.olive}`,
      verbose: `${colors.bold}${colors.beige}`,
    },
    message: {
      error: colors.crimson,
      warn: colors.gold,
      info: colors.brightWhite,
      debug: colors.khaki,
      verbose: colors.beige,
    },
  },

  // Royal theme
  royal: {
    appName: `${colors.bold}${colors.white}${colors.bgIndigo}`,
    pid: `${colors.dim}${colors.lavender}`,
    timestamp: `${colors.dim}${colors.violet}`,
    context: `${colors.bold}${colors.gold}`,
    level: {
      error: `${colors.bold}${colors.crimson}`,
      warn: `${colors.bold}${colors.gold}`,
      info: `${colors.bold}${colors.lavender}`,
      debug: `${colors.bold}${colors.purple}`,
      verbose: `${colors.bold}${colors.violet}`,
    },
    message: {
      error: colors.crimson,
      warn: colors.gold,
      info: colors.lavender,
      debug: colors.purple,
      verbose: colors.brightMagenta,
    },
  },

  // Midnight theme
  midnight: {
    appName: `${colors.bold}${colors.brightWhite}${colors.bgNavy}`,
    pid: `${colors.dim}${colors.skyblue}`,
    timestamp: `${colors.dim}${colors.steel}`,
    context: `${colors.bold}${colors.turquoise}`,
    level: {
      error: `${colors.bold}${colors.crimson}`,
      warn: `${colors.bold}${colors.gold}`,
      info: `${colors.bold}${colors.skyblue}`,
      debug: `${colors.bold}${colors.violet}`,
      verbose: `${colors.bold}${colors.teal}`,
    },
    message: {
      error: colors.salmon,
      warn: colors.gold,
      info: colors.brightWhite,
      debug: colors.lavender,
      verbose: colors.teal,
    },
  },

  // Candy theme
  candy: {
    appName: `${colors.bold}${colors.white}${colors.hotpink}`,
    pid: `${colors.dim}${colors.cyan}`,
    timestamp: `${colors.dim}${colors.brightYellow}`,
    context: `${colors.bold}${colors.brightCyan}`,
    level: {
      error: `${colors.bold}${colors.crimson}`,
      warn: `${colors.bold}${colors.orange}`,
      info: `${colors.bold}${colors.mint}`,
      debug: `${colors.bold}${colors.fuchsia}`,
      verbose: `${colors.bold}${colors.brightYellow}`,
    },
    message: {
      error: colors.crimson,
      warn: colors.orange,
      info: colors.mint,
      debug: colors.fuchsia,
      verbose: colors.brightYellow,
    },
  },

  // High contrast theme
  highContrast: {
    appName: `${colors.bold}${colors.brightWhite}${colors.bgBlack}`,
    pid: `${colors.bold}${colors.brightWhite}`,
    timestamp: `${colors.bold}${colors.brightWhite}`,
    context: `${colors.bold}${colors.black}${colors.bgBrightWhite}`,
    level: {
      error: `${colors.bold}${colors.white}${colors.bgCrimson}`,
      warn: `${colors.bold}${colors.black}${colors.bgBrightYellow}`,
      info: `${colors.bold}${colors.black}${colors.bgMint}`,
      debug: `${colors.bold}${colors.white}${colors.bgBlue}`,
      verbose: `${colors.bold}${colors.black}${colors.bgTurquoise}`,
    },
    message: {
      error: `${colors.bold}${colors.crimson}`,
      warn: `${colors.bold}${colors.brightYellow}`,
      info: `${colors.bold}${colors.brightWhite}`,
      debug: `${colors.bold}${colors.brightBlue}`,
      verbose: `${colors.bold}${colors.brightCyan}`,
    },
  },

  // Matrix theme
  matrix: {
    appName: `${colors.bold}${colors.brightGreen}`,
    pid: `${colors.dim}${colors.green}`,
    timestamp: `${colors.dim}${colors.green}`,
    context: `${colors.bold}${colors.lime}`,
    level: {
      error: `${colors.bold}${colors.brightRed}`,
      warn: `${colors.bold}${colors.yellow}`,
      info: `${colors.bold}${colors.brightGreen}`,
      debug: `${colors.bold}${colors.green}`,
      verbose: `${colors.bold}${colors.mint}`,
    },
    message: {
      error: colors.brightRed,
      warn: colors.yellow,
      info: colors.brightGreen,
      debug: colors.green,
      verbose: colors.mint,
    },
  },

  // Light theme
  light: {
    appName: `${colors.bold}${colors.blue}`,
    pid: `${colors.dim}${colors.gray}`,
    timestamp: `${colors.dim}${colors.black}`,
    context: `${colors.bold}${colors.blue}`,
    level: {
      error: `${colors.bold}${colors.crimson}`,
      warn: `${colors.bold}${colors.orange}`,
      info: `${colors.bold}${colors.blue}`,
      debug: `${colors.bold}${colors.gray}`,
      verbose: `${colors.bold}${colors.indigo}`,
    },
    message: {
      error: colors.red,
      warn: colors.orange,
      info: colors.blue,
      debug: colors.gray,
      verbose: colors.indigo,
    },
  },

  // Colorful theme
  colorful: {
    appName: `${colors.bold}${colors.brightMagenta}`,
    pid: `${colors.bold}${colors.cyan}`,
    timestamp: `${colors.bold}${colors.brightYellow}`,
    context: `${colors.bold}${colors.brightGreen}`,
    level: {
      error: `${colors.bold}${colors.brightRed}`,
      warn: `${colors.bold}${colors.brightYellow}`,
      info: `${colors.bold}${colors.brightCyan}`,
      debug: `${colors.bold}${colors.brightBlue}`,
      verbose: `${colors.bold}${colors.brightMagenta}`,
    },
    message: {
      error: colors.brightRed,
      warn: colors.brightYellow,
      info: colors.brightCyan,
      debug: colors.brightBlue,
      verbose: colors.brightMagenta,
    },
  },

  // Minimal theme
  minimal: {
    appName: `${colors.bold}${colors.white}`,
    pid: `${colors.dim}${colors.white}`,
    timestamp: `${colors.dim}${colors.white}`,
    context: `${colors.bold}${colors.white}`,
    level: {
      error: `${colors.bold}${colors.red}`,
      warn: `${colors.bold}${colors.yellow}`,
      info: `${colors.bold}${colors.white}`,
      debug: `${colors.dim}${colors.white}`,
      verbose: `${colors.dim}${colors.white}`,
    },
    message: {
      error: colors.white,
      warn: colors.white,
      info: colors.white,
      debug: colors.white,
      verbose: colors.white,
    },
  },
};

/**
 * Theme highlight colors for each logger theme
 * Each color is unique within its theme for proper contrast
 */
export const themeHighlights: IThemeHighlight = {
  default: colors.brightCyan + colors.bold + colors.underline,
  dark: colors.brightMagenta,
  pastel: colors.magenta,
  ocean: colors.fuchsia + colors.bold,
  sunset: colors.brightCyan + colors.bold,
  forest: colors.salmon + colors.bold,
  cyberpunk: colors.brightYellow + colors.bold,
  coffee: colors.skyblue + colors.bold,
  royal: colors.mint + colors.bold,
  midnight: colors.hotpink + colors.bold,
  candy: colors.navy + colors.bold,
  highContrast: colors.brightMagenta + colors.underline + colors.bold,
  matrix: colors.brightWhite + colors.bold,
  light: colors.blue + colors.underline + colors.bold,
  colorful: colors.brightWhite + colors.bold,
  minimal: colors.white + colors.underline,
};
