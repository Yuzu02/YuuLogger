module.exports = {
  displayName: "YuuLogger",
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "./",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.spec.json",
        diagnostics: true,
      },
    ],
  },
  collectCoverageFrom: [
    "src/**/*.(t|j)s",
    "!src/index.ts",
    "!src/**/*.d.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.decorator.ts",
  ],
  coverageDirectory: "./coverage",
  testPathIgnorePatterns: ["/node_modules/"],
  moduleFileExtensions: ["js", "json", "ts"],
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
  },
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
