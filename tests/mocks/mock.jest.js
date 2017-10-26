const jestCLI = {
  success: true,
  runCLI: jest.fn((config, rootDir, callback) => {
    callback(jestCLI.success);
  }),
};

module.exports = jestCLI;
