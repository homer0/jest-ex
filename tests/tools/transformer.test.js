/* eslint-disable global-require */
jest.mock('../../src/babel.js', () => require('../mocks/mock.babel'));
jest.mock('glob', () => ({ sync: jest.fn() }));
jest.mock('html-loader', () => jest.fn((code) => code));
jest.mock('fs', () => ({ readFileSync: jest.fn() }));

jest.unmock('path');
jest.unmock('../../src/tools/transformer');
jest.unmock('../../src/utils/functions');

import path from 'path';
import glob from 'glob';
import fs from 'fs';
import htmlLoader from 'html-loader';
import babel from '../mocks/mock.babel';
import JestExTransformer from '../../src/tools/transformer';
import 'jasmine-expect';

describe('JestExTransformer', () => {
  beforeEach(() => {
    fs.readFileSync.mockReset();
  });

  it('should create a new instance of the transformer and set the default properties', () => {
    // Given
    let sut = null;
    // When
    sut = new JestExTransformer();
    // Then
    expect(sut).toBeInstanceOf(JestExTransformer);
    expect(sut.invisibleLines).toBeArray();
    expect(sut.ignoreLineComment).toBeString();
  });

  it('should process a file with Babel', () => {
    // Given
    const code = 'some-code';
    const fpath = 'some/file.js';
    let sut = null;
    let result = null;
    // When
    sut = new JestExTransformer();
    result = sut.process(code, fpath);
    // Then
    expect(result).toBe(code);
    expect(babel.transform).toHaveBeenCalledTimes(1);
    expect(babel.transform).toHaveBeenCalledWith(code, expect.any(Object));
  });

  it('should process an HTML file', () => {
    // Given
    const code = '<strong>some-code</strong>';
    const fpath = 'some/file.html';
    fs.readFileSync.mockImplementation(() => code);
    let sut = null;
    let result = null;
    // When
    sut = new JestExTransformer();
    result = sut.process(code, fpath);
    // Then
    expect(result).toBe(code);
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync).toHaveBeenCalledWith(fpath, 'utf-8');
    expect(htmlLoader).toHaveBeenCalledTimes(1);
    expect(htmlLoader).toHaveBeenCalledWith(code);
  });

  it('should format the special paths Jest-Ex allows', () => {
    // Given
    const rootPath = path
    .relative(__dirname, process.cwd())
    .replace(/\\/g, '/');
    const cases = [
      {
        original: 'import file from \'/src/folder/file\';',
        expected: `import file from '${rootPath}/src/folder/file';`,
      },
      {
        original: 'import {\nutil,\ntool\n} from \'/src/folder/file\';',
        expected: `import {\nutil,\ntool\n} from '${rootPath}/src/folder/file';`,
      },
      {
        original: 'jest.unmock(\'/src/folder/file\');',
        expected: `jest.unmock('${rootPath}/src/folder/file');`,
      },
      {
        original: 'jest.mock(\'/src/folder/file\', () => {});',
        expected: `jest.mock('${rootPath}/src/folder/file', () => {});`,
      },
      {
        original: 'jest.setMock(\'/src/folder/file\', () => {});',
        expected: `jest.setMock('${rootPath}/src/folder/file', () => {});`,
      },
      {
        original: 'jest.require(\'/src/folder/file\');',
        expected: `jest.require('${rootPath}/src/folder/file');`,
      },
    ];
    const separator = '\n\n';
    const code = cases.map((testCase) => testCase.original).join(separator);
    let sut = null;
    let result = null;
    // When
    sut = new JestExTransformer();
    result = sut.process(code, __filename);
    // Then
    result.split(separator).forEach((line, i) => {
      expect(line).toBe(cases[i].expected);
    });
  });

  it('should expand globs on \'unmock\' calls', () => {
    // Given
    const code = 'jest.unmock(\'/src/tools/**\')';
    const relative = '../../src/tools';
    const thispath = path.join(__dirname, relative);
    const files = ['A', 'B'];
    glob.sync.mockReturnValueOnce(files.map((file) => path.join(thispath, `file${file}.js`)));
    let sut = null;
    let result = null;
    // When
    sut = new JestExTransformer();
    result = sut.process(code, __filename);
    // Then
    result.trim().split('\n').forEach((line, i) => {
      const linepath = path.join(relative, `file${files[i]}.js`);
      expect(line).toBe(`jest.unmock('${linepath}');`);
    });
  });

  it('should expand an \'unmock\' glob with an ignore pattern', () => {
    // Given
    const code = 'jest.unmock(\'/src/tools/**!A\')';
    const relative = '../../src/tools';
    const thispath = path.join(__dirname, relative);
    const files = ['A', 'B'];
    glob.sync.mockReturnValueOnce(files.map((file) => path.join(thispath, `file${file}.js`)));
    let sut = null;
    let result = null;
    // When
    sut = new JestExTransformer();
    result = sut.process(code, __filename);
    // Then
    const fpath = path.join(relative, 'fileB.js');
    expect(result.trim()).toBe(`jest.unmock('${fpath}');`);
  });

  it('should expand an \'unmock\' glob with an invalid ignore pattern', () => {
    // Given
    const code = 'jest.unmock(\'/src/tools/**!\')';
    const relative = '../../src/tools';
    const thispath = path.join(__dirname, relative);
    const files = ['A', 'B'];
    glob.sync.mockReturnValueOnce(files.map((file) => path.join(thispath, `file${file}.js`)));
    let sut = null;
    let result = null;
    // When
    sut = new JestExTransformer();
    result = sut.process(code, __filename);
    // Then
    result.trim().split('\n').forEach((line, i) => {
      const linepath = path.join(relative, `file${files[i]}.js`);
      expect(line).toBe(`jest.unmock('${linepath}');`);
    });
  });

  it('should expand an \'unmock\' glob with an ignore pattern list', () => {
    // Given
    const code = 'jest.unmock(\'/src/tools/**!fileA,fileC\')';
    const relative = '../../src/tools';
    const thispath = path.join(__dirname, relative);
    const files = ['A', 'B', 'C'];
    glob.sync.mockReturnValueOnce(files.map((file) => path.join(thispath, `file${file}.js`)));
    let sut = null;
    let result = null;
    const expectedFilepath = path.join(relative, 'fileB.js');
    // When
    sut = new JestExTransformer();
    result = sut.process(code, __filename).trim();
    // Then
    expect(result).toBe(`jest.unmock('${expectedFilepath}');`);
  });

  it('should ignore a file if it doesn\'t have a javascript extension', () => {
    // Given
    const code = 'jest.unmock(\'/src/tools/**!\')';
    let sut = null;
    let result = null;
    // When
    sut = new JestExTransformer();
    result = sut.process(code, 'file.css');
    // Then
    expect(result).toBe(code);
  });
});
