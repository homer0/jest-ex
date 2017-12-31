const jestCLI = {
  success: true,
  runCLI: jest.fn(() => Promise.resolve({ results: { success: jestCLI.success } })),
};

module.exports = jestCLI;
