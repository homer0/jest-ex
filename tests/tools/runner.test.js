/* eslint-disable global-require */
jest.mock('yargs', () => ({ argv: {} }));
jest.mock('../../src/jest.js', () => require('../mock.jest'));

jest.unmock('path');
jest.unmock('../../src/tools/runner');
jest.unmock('../../src/utils/functions');

import path from 'path';
import yargs from 'yargs';
import jestCLI from '../../src/jest';
import JestExRunner from '../../src/tools/runner';
import fileFinder from '../../src/utils/fileFinder';
import jestConfig from '../mock.config';
import 'jasmine-expect';

describe('JestExRunner', () => {
    const config = {
        hello: 'world',
    };

    beforeEach(() => {
        delete yargs.argv.files;
        fileFinder.mockClear();
        jestCLI.runCLI.mockClear();
    });

    it('should create a new instance of the runner and set the default properties', () => {
        const runner = new JestExRunner(config);
        expect(runner instanceof JestExRunner).toBeTrue();
        expect(runner.config).toEqual(config);
        expect(runner.runInBand).toBeTrue();
        expect(runner.cache).toBeFalse();
        expect(Object.keys(runner.stubsRegexs)).toEqual(['images', 'styles', 'html']);
    });

    it('should load the configuration from a file', () => {
        const runner = new JestExRunner('./tests/mock.config');
        expect(runner.config).toEqual(jestConfig);
    });

    it('should add the Jest-Ex transformer to the config', () => {
        const runner = new JestExRunner(config, { addTransformer: true });
        expect(runner.config).not.toEqual(config);
        expect(runner.config.transform).toBeObject();
        const [regex] = Object.keys(runner.config.transform);
        expect(regex).toMatch(/js\|jsx/);
        expect(runner.config.transform[regex])
        .toBe(path.join(__dirname, '../../src/transform.js'));
    });

    it('should add the Jest-Ex transformer to an existing transformers list', () => {
        const transformConfig = Object.assign({}, config, {
            transform: {
                css: './style.transform.js',
            },
        });

        const runner = new JestExRunner(transformConfig, { addTransformer: true });
        expect(runner.config).not.toEqual(config);
        const [css, js] = Object.keys(runner.config.transform);
        expect(runner.config.transform[css]).toBe(transformConfig.transform.css);
        expect(runner.config.transform[js]).toBe(path.join(__dirname, '../../src/transform.js'));
    });

    it('should add the stubs automatically from the constructor', () => {
        const runner = new JestExRunner(config, { addStubs: true });
        expect(runner.config).not.toEqual(config);

        const { moduleNameMapper } = runner.config;
        const moduleNameMapperKeys = Object.keys(moduleNameMapper);
        const expectations = {
            '(jpe?g|png|gif|svg)': path.join(__dirname, '../../src/stubs/images.js'),
            's?css': path.join(__dirname, '../../src/stubs/styles.js'),
            html: path.join(__dirname, '../../src/stubs/html.js'),
        };

        Object.keys(expectations).forEach((exp) => {
            const map = moduleNameMapperKeys.filter(k => k.includes(exp))[0];
            expect(map).toBeDefined();
            expect(moduleNameMapper[map]).toBe(expectations[exp]);
        });
    });

    it('should filter a test file from the constructor', () => {
        const file = 'batman-file';
        const regex = '^((?!(?:batman\\-file)).)*$';
        yargs.argv.files = file;
        const runner = new JestExRunner(config);
        expect(runner.config).not.toEqual(config);

        expect(runner.config.testPathIgnorePatterns).toBeArray();
        expect(runner.config.testPathIgnorePatterns[0]).toEqual(regex);
    });

    it('should filter a test file and find its source file', () => {
        const coverageConfig = Object.assign({}, config, {
            testPathIgnorePatterns: [],
            collectCoverage: true,
        });

        const file = 'nightwing-file';
        const regex = '^((?!(?:nightwing\\-file)).)*$';
        const coverageRegex = 'nightwing\\\\-file';
        yargs.argv.files = file;
        fileFinder.mockReturnValueOnce([file]);
        const runner = new JestExRunner(coverageConfig);
        expect(runner.config).not.toEqual(config);

        expect(runner.config.testPathIgnorePatterns).toBeArray();
        expect(runner.config.testPathIgnorePatterns[0]).toEqual(regex);
        expect(runner.config.collectCoverageOnlyFrom).toBeObject();
        expect(runner.config.collectCoverageOnlyFrom[file]).toBeTrue();

        expect(fileFinder.mock.calls.length).toBe(1);
        expect(fileFinder.mock.calls[0][0]).toBe(path.join(__dirname, '../../src'));
        expect(fileFinder.mock.calls[0][1].toString()).toMatch(RegExp(coverageRegex));
    });

    it('should filter a list of tests and not find they source file', () => {
        const coverageConfig = Object.assign({}, config, {
            collectCoverage: true,
        });

        const files = 'charito, maru';
        const regex = '^((?!(?:charito|maru)).)*$';
        yargs.argv.files = files;
        fileFinder.mockReturnValueOnce([]);
        const runner = new JestExRunner(coverageConfig);
        expect(runner.config).not.toEqual(config);
        expect(runner.config.testPathIgnorePatterns).toBeArray();
        expect(runner.config.testPathIgnorePatterns[0]).toEqual(regex);
        expect(runner.config.collectCoverageOnlyFrom).toBeUndefined();
    });

    it('should be able to manually add stubs', () => {
        const runner = new JestExRunner(config);
        expect(runner.config.moduleNameMapper).toBeUndefined();

        let i = 0;
        ['images', 'styles', 'html'].forEach((stub) => {
            i += 1;
            runner.addStubs([stub]);
            expect(runner.config.moduleNameMapper).toBeObject();
            expect(Object.keys(runner.config.moduleNameMapper).length).toBe(i);
            expect(runner.config.moduleNameMapper[runner.stubsRegexs[stub]])
            .toBe(path.join(__dirname, `../../src/stubs/${stub}.js`));
        });
    });

    it('shouldn\'t add a stub if the preset doesnt exists on the class', () => {
        const runner = new JestExRunner(config);
        runner.addStubs(['gif']);
        expect(runner.config.moduleNameMapper).toEqual({});
    });

    pit('should successfully run the tests', () => {
        const runner = new JestExRunner(config);
        return runner.run()
        .then(() => {
            expect(jestCLI.runCLI.mock.calls.length).toBe(1);
            expect(jestCLI.runCLI.mock.calls[0][0]).toEqual(Object.assign({}, {
                config: Object.assign({}, config, {
                    rootDir: runner.rootPath,
                }),
                runInBand: true,
                cache: false,
            }));

            expect(jestCLI.runCLI.mock.calls[0][1]).toEqual(runner.rootPath);
        });
    });

    pit('should fail while trying to run the tests', () => {
        jestCLI.success = false;
        const runner = new JestExRunner(config);
        return runner.run()
        .then(() => {
            expect(true).toBeFalse();
        })
        .catch(() => {
            expect(true).toBeTrue();
        });
    });
});
