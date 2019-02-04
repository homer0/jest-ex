const babel = {
  transform: jest.fn((code) => ({ code })),
  preset: 'mocked-preset',
};

module.exports = babel;
