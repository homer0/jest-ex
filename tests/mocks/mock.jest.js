const jestCLI = {
  success: true,
  runCLI: jest.fn(() => new Promise((resolve, reject) => {
    if (jestCLI.success) {
      resolve();
    } else {
      reject();
    }
  })),
};

module.exports = jestCLI;
