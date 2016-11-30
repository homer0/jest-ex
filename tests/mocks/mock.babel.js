const babel = {
    validFile: true,
    util: {
        canCompile: jest.fn(() => babel.validFile),
    },
    transform: jest.fn(code => ({ code })),
    preset: 'mocked-preset',
};

module.exports = babel;
