/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["./tests"],
  coveragePathIgnorePatterns: ["node_modules", "tests/mocks"],
  collectCoverage: true,
  coverageReporters: ["json", "lcov", "text", "clover", "json-summary"],
  reporters: ["default", "jest-junit"],
  coverageDirectory: "coverage",
};
