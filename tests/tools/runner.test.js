/* eslint-disable global-require */
jest.mock('yargs', () => ({ argv: {} }));
jest.mock('../../src/jest.js', () => require('../mocks/mock.jest'));

jest.unmock('path');
jest.unmock('../../src/tools/runner');
jest.unmock('../../src/utils/functions');

import path from 'path';
import yargs from 'yargs';
import jestCLI from '../../src/jest';
import JestExRunner from '../../src/tools/runner';
import fileFinder from '../../src/utils/fileFinder';
import jestConfig from '../mocks/mock.config';
import 'jasmine-expect';

describe('JestExRunner', () => {
  beforeEach(() => {
    delete yargs.argv.files;
    fileFinder.mockClear();
    jestCLI.runCLI.mockClear();
  });

  it('should create a new instance of the runner and set the default properties', () => {
    // Given
    const config = {
      hello: 'world',
    };
    let sut = null;
    // When
    sut = new JestExRunner(config);
    // Then
    expect(sut).toBeInstanceOf(JestExRunner);
    expect(sut.config).toEqual(config);
    expect(sut.runInBand).toBeFalse();
    expect(sut.cache).toBeFalse();
    expect(Object.keys(sut.stubsRegexs)).toEqual(['images', 'styles']);
  });

  it('should load the configuration from a file', () => {
    // Given
    const config = './tests/mocks/mock.config';
    let sut = null;
    // When
    sut = new JestExRunner(config);
    // Then
    expect(sut.config).toEqual(jestConfig);
  });

  it('should add the Jest-Ex transformer to the config', () => {
    // Given
    const config = {
      hello: 'world',
    };
    const options = {
      addTransformer: true,
    };
    let sut = null;
    // When
    sut = new JestExRunner(config, options);
    // Then
    expect(sut.config.transform).toBeObject();
    const [regex] = Object.keys(sut.config.transform);
    expect(regex).toMatch(/js\|jsx/);
    expect(sut.config.transform[regex]).toBe(path.join(__dirname, '../../src/transform.js'));
  });

  it('should add the Jest-Ex transformer to an existing transformers list', () => {
    // Given
    const config = {
      hello: 'world',
      transform: {
        css: './style.transform.js',
      },
    };
    const options = {
      addTransformer: true,
    };
    let sut = null;
    let css = null;
    let js = null;
    // When
    sut = new JestExRunner(config, options);
    [css, js] = Object.keys(sut.config.transform);
    // Then
    expect(sut.config.transform[css]).toBe(config.transform.css);
    expect(sut.config.transform[js]).toBe(path.join(__dirname, '../../src/transform.js'));
  });

  it('should add the stubs automatically from the constructor', () => {
    // Given
    const config = {
      hello: 'world',
    };
    const options = {
      addStubs: true,
    };
    let sut = null;
    let mapper = null;
    let mapperKeys = null;
    const expectations = {
      '(jpe?g|png|gif|svg)': path.join(__dirname, '../../src/stubs/images.js'),
      's?css': path.join(__dirname, '../../src/stubs/styles.js'),
    };
    // When
    sut = new JestExRunner(config, options);
    mapper = sut.config.moduleNameMapper;
    mapperKeys = Object.keys(mapper);
    // Then
    Object.keys(expectations).forEach((expression) => {
      const map = mapperKeys.find((key) => key.includes(expression));
      expect(map).toBeDefined();
      expect(mapper[map]).toBe(expectations[expression]);
    });
  });

  it('should filter a test file from the constructor', () => {
    // Given
    const config = {
      hello: 'world',
    };
    const file = 'batman-file';
    yargs.argv.files = file;
    let sut = null;
    let firstIgnoredPattern = null;
    const expectedExpression = '^((?!(?:batman\\-file)).)*$';
    // When
    sut = new JestExRunner(config);
    [firstIgnoredPattern] = sut.config.testPathIgnorePatterns;
    // Then
    expect(sut.config.testPathIgnorePatterns).toBeArray();
    expect(firstIgnoredPattern).toEqual(expectedExpression);
  });

  it('should filter a test file and find its source file', () => {
    // Given
    const config = {
      hello: 'world',
      testPathIgnorePatterns: [],
      collectCoverage: true,
    };
    const file = 'nightwing-file';
    yargs.argv.files = file;
    fileFinder.mockReturnValueOnce([file]);
    let sut = null;
    let firstIgnoredPattern = null;
    const expectedExpression = '^((?!(?:nightwing\\-file)).)*$';
    const expectedCoverageExpression = new RegExp('nightwing\\-file', 'gi');
    // When
    sut = new JestExRunner(config);
    [firstIgnoredPattern] = sut.config.testPathIgnorePatterns;
    // Then
    expect(sut.config.testPathIgnorePatterns).toBeArray();
    expect(firstIgnoredPattern).toEqual(expectedExpression);
    expect(sut.config.collectCoverageOnlyFrom).toEqual([file]);
    expect(fileFinder).toHaveBeenCalledTimes(1);
    expect(fileFinder).toHaveBeenCalledWith(
      path.join(__dirname, '../../src'),
      expectedCoverageExpression,
      expect.any(RegExp)
    );
  });

  it('should filter a list of tests and not find they source file', () => {
    // Given
    const config = {
      hello: 'world',
      collectCoverage: true,
    };
    const files = 'charito, maru';
    yargs.argv.files = files;
    fileFinder.mockReturnValueOnce([]);
    let sut = null;
    let firstIgnoredPattern = null;
    const expectedExpression = '^((?!(?:charito|maru)).)*$';
    // When
    sut = new JestExRunner(config);
    [firstIgnoredPattern] = sut.config.testPathIgnorePatterns;
    // Then
    expect(sut.config.testPathIgnorePatterns).toBeArray();
    expect(firstIgnoredPattern).toEqual(expectedExpression);
    expect(sut.config.collectCoverageOnlyFrom).toBeUndefined();
  });
  /**
   * @todo Refactor test
   */
  it('should be able to manually add stubs', () => {
    // Given
    const config = {
      hello: 'world',
    };
    const stubs = ['images', 'styles'];
    let sut = null;
    // When/Then
    sut = new JestExRunner(config);
    expect(sut.config.moduleNameMapper).toBeUndefined();
    stubs.forEach((stub, index) => {
      sut.addStubs([stub]);
      expect(sut.config.moduleNameMapper).toBeObject();
      expect(Object.keys(sut.config.moduleNameMapper).length).toBe(index + 1);
      expect(sut.config.moduleNameMapper[sut.stubsRegexs[stub]])
      .toBe(path.join(__dirname, `../../src/stubs/${stub}.js`));
    });
  });

  it('shouldn\'t add a stub if the preset doesn\'t exists on the class', () => {
    // Given
    const config = {
      hello: 'world',
    };
    let sut = null;
    const stubs = ['gif'];
    // When
    sut = new JestExRunner(config);
    sut.addStubs(stubs);
    expect(sut.config.moduleNameMapper).toEqual({});
  });

  it('should successfully run the tests', () => {
    // Given
    const config = {
      hello: 'world',
    };
    let sut = null;
    // When
    sut = new JestExRunner(config);
    return sut
    .run()
    .then(() => {
      // Then
      expect(jestCLI.runCLI).toHaveBeenCalledTimes(1);
      expect(jestCLI.runCLI).toHaveBeenCalledWith(
        Object.assign({}, config, {
          rootDir: sut.rootPath,
          runInBand: false,
          cache: false,
        }),
        [sut.rootPath]
      );
    })
    .catch((error) => {
      throw error;
    });
  });

  it('should format the dictionaries on the configuration to JSON strings', () => {
    // Given
    const config = {
      list: ['one', 'two', 'three'],
      dictionary: {
        keyOne: 'one',
        keyTwo: 'two',
      },
      hello: 'charito',
    };
    const options = {
      runInParallel: false,
    };
    let sut = null;
    // When
    sut = new JestExRunner(config, options);
    return sut
    .run()
    .then(() => {
      // Then
      expect(jestCLI.runCLI).toHaveBeenCalledTimes(1);
      expect(jestCLI.runCLI).toHaveBeenCalledWith(
        Object.assign({}, config, {
          rootDir: sut.rootPath,
          runInBand: true,
          cache: false,
          list: config.list,
          hello: config.hello,
          dictionary: JSON.stringify(config.dictionary),
        }),
        [sut.rootPath]
      );
    })
    .catch((error) => {
      throw error;
    });
  });

  it('should fail while trying to run the tests', () => {
    // Given
    jestCLI.success = false;
    const config = {
      hello: 'world',
    };
    let sut = null;
    // When
    sut = new JestExRunner(config);
    return sut
    .run()
    .then(() => {
      expect(true).toBeFalse();
    })
    .catch((error) => {
      expect(error).toEqual({
        results: {
          success: false,
        },
      });
    });
  });
});
