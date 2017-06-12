/* eslint-disable global-require */
jest.mock('../../src/babel.js', () => require('../mocks/mock.babel'));
jest.mock('glob', () => ({ sync: jest.fn() }));
jest.mock('html-loader', () => jest.fn(code => code));
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
        const transformer = new JestExTransformer();
        expect(transformer instanceof JestExTransformer).toBeTrue();
        expect(transformer.invisibleLines).toBeArray();
        expect(transformer.ignoreLineComment).toBeString();
    });

    it('should process a file with Babel', () => {
        const code = 'some-code';
        const fpath = 'some/file.js';
        const transformer = new JestExTransformer();
        const result = transformer.process(code, fpath);

        expect(result).toBe(code);
        expect(babel.util.canCompile.mock.calls.length).toEqual(1);
        expect(babel.util.canCompile.mock.calls[0][0]).toEqual(fpath);
        expect(babel.transform.mock.calls.length).toEqual(1);
        expect(babel.transform.mock.calls[0][0]).toEqual(code);
    });

    it('should process an HTML file', () => {
        const code = '<strong>some-code</strong>';
        const fpath = 'some/file.html';
        const { readFileSync } = fs;
        readFileSync.mockImplementation(() => code);
        const transformer = new JestExTransformer();
        const result = transformer.process(code, fpath);

        expect(result).toBe(code);
        expect(readFileSync.mock.calls.length).toEqual(1);
        expect(readFileSync.mock.calls[0][0]).toEqual(fpath);
        expect(htmlLoader.mock.calls.length).toEqual(1);
        expect(htmlLoader.mock.calls[0][0]).toEqual(code);
    });

    it('should format the special paths Jest-Ex allows', () => {
        const rootPath = path.relative(__dirname, process.cwd());
        const cases = [
            {
                original: 'import file from \'src:folder/file\';',
                expected: `import file from '${rootPath}/src/folder/file';`,
            },
            {
                original: 'import {\nutil,\ntool\n} from \'src:folder/file\';',
                expected: `import {\nutil,\ntool\n} from '${rootPath}/src/folder/file';`,
            },
            {
                original: 'jest.unmock(\'src:folder/file\');',
                expected: `jest.unmock('${rootPath}/src/folder/file');`,
            },
            {
                original: 'jest.mock(\'src:folder/file\', () => {});',
                expected: `jest.mock('${rootPath}/src/folder/file', () => {});`,
            },
            {
                original: 'jest.setMock(\'src:folder/file\', () => {});',
                expected: `jest.setMock('${rootPath}/src/folder/file', () => {});`,
            },
            {
                original: 'jest.require(\'src:folder/file\');',
                expected: `jest.require('${rootPath}/src/folder/file');`,
            },
        ];
        const separator = '\n\n';
        const code = cases.map(c => c.original).join(separator);
        const transformer = new JestExTransformer();
        const result = transformer.process(code, __filename);
        result.split(separator).forEach((line, i) => {
            expect(line).toBe(cases[i].expected);
        });
    });

    it('should expand globs on \'unmock\' calls', () => {
        const code = 'jest.unmock(\'src:tools/**\')';
        const relative = '../../src/tools';
        const thispath = path.join(__dirname, relative);
        const files = ['A', 'B'];
        glob.sync.mockReturnValueOnce(files.map(f => path.join(thispath, `file${f}.js`)));
        const transformer = new JestExTransformer();
        const result = transformer.process(code, __filename);
        result.trim().split('\n').forEach((line, i) => {
            const linepath = path.join(relative, `file${files[i]}.js`);
            expect(line).toBe(`jest.unmock('${linepath}');`);
        });
    });

    it('should expand an \'unmock\' glob with an ignore pattern', () => {
        const code = 'jest.unmock(\'src:tools/**!A\')';
        const relative = '../../src/tools';
        const thispath = path.join(__dirname, relative);
        const files = ['A', 'B'];
        glob.sync.mockReturnValueOnce(files.map(f => path.join(thispath, `file${f}.js`)));
        const transformer = new JestExTransformer();
        const result = transformer.process(code, __filename);
        const fpath = path.join(relative, 'fileB.js');
        expect(result.trim()).toBe(`jest.unmock('${fpath}');`);
    });

    it('should expand an \'unmock\' glob with an invalid ignore pattern', () => {
        const code = 'jest.unmock(\'src:tools/**!\')';
        const relative = '../../src/tools';
        const thispath = path.join(__dirname, relative);
        const files = ['A', 'B'];
        glob.sync.mockReturnValueOnce(files.map(f => path.join(thispath, `file${f}.js`)));
        const transformer = new JestExTransformer();
        const result = transformer.process(code, __filename);
        result.trim().split('\n').forEach((line, i) => {
            const linepath = path.join(relative, `file${files[i]}.js`);
            expect(line).toBe(`jest.unmock('${linepath}');`);
        });
    });

    it('should expand an \'unmock\' glob with an ignore pattern list', () => {
        const code = 'jest.unmock(\'src:tools/**!fileA,fileC\')';
        const relative = '../../src/tools';
        const thispath = path.join(__dirname, relative);
        const files = ['A', 'B', 'C'];
        glob.sync.mockReturnValueOnce(files.map(f => path.join(thispath, `file${f}.js`)));
        const transformer = new JestExTransformer();
        const result = transformer.process(code, __filename);
        const fpath = path.join(relative, 'fileB.js');
        expect(result.trim()).toBe(`jest.unmock('${fpath}');`);
    });

    it('should ignore a file if it doesn\'t have a javascript extension', () => {
        const code = 'jest.unmock(\'src:tools/**!\')';
        const transformer = new JestExTransformer();
        const result = transformer.process(code, 'file.css');
        expect(result).toBe(code);
    });

    it('should ignore a file if it can\'t be compiled by Babel', () => {
        const code = 'jest.unmock(\'src:tools/**!\')';
        babel.util.canCompile.mockReturnValueOnce(false);
        const transformer = new JestExTransformer();
        const result = transformer.process(code, 'file.js');
        expect(result).toBe(code);
    });
});
