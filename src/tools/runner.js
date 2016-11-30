/* eslint-disable global-require */
import path from 'path';
import yargs from 'yargs';
import jestCLI from '../jest';
import utils from '../utils/functions';
import fileFinder from '../utils/fileFinder';

class JestExRunner {

    constructor(config, {
        runInParallel,
        cache,
        addTransformer,
        addStubs,
    } = {}) {
        this.rootPath = path.resolve(process.cwd());
        this.config = {};
        if (typeof config === 'string') {
            this.config = require(path.join(this.rootPath, config));
        } else {
            this.config = Object.assign({}, config);
        }

        this.runInBand = !runInParallel;
        this.cache = !!cache;
        this.stubsRegexs = {
            images: '^[\\.\\/a-zA-Z0-9$_-]+\\.(jpe?g|png|gif|svg)$',
            styles: '^[\\.\\/a-zA-Z0-9$_-]+\\.s?css$',
            html: '^[\\.\\/a-zA-Z0-9$_-]+\\.html',
        };

        if (addTransformer) {
            this._addTransformer();
        }

        if (addStubs) {
            this.addStubs();
        }

        if (yargs.argv.files) {
            this._detectFiles(yargs.argv.files);
        }
    }

    addStubs(stubs = ['images', 'styles', 'html']) {
        const newConfig = {};
        stubs.forEach((name) => {
            const regex = this.stubsRegexs[name];
            if (regex) {
                newConfig[regex] = this._getProjectFilePath(`../stubs/${name}.js`);
            }
        }, this);

        if (this.config.moduleNameMapper) {
            Object.assign(this.config.moduleNameMapper, newConfig);
        } else {
            this.config.moduleNameMapper = newConfig;
        }

        return this;
    }

    run() {
        this.config.rootDir = this.rootPath;
        return new Promise((resolve, reject) => {
            jestCLI.runCLI({
                config: this.config,
                runInBand: this.runInBand,
                cache: this.cache,
            }, this.config.rootDir, (success) => {
                if (success) {
                    resolve();
                } else {
                    reject();
                }
            });
        });
    }

    _addTransformer() {
        const newConfig = {
            '\\.[js|jsx]+$': this._getProjectFilePath('../transform.js'),
        };

        if (this.config.transform) {
            Object.assign(this.config.transform, newConfig);
        } else {
            this.config.transform = newConfig;
        }
    }

    _detectFiles(files) {
        if (!this.config.testPathIgnorePatterns) {
            this.config.testPathIgnorePatterns = [];
        }

        const regexList = [];
        files.split(',').forEach((file) => {
            regexList.push(utils.escapeRegex(file.trim()));
        }, this);

        const sanitized = regexList.join('|');
        this.config.testPathIgnorePatterns.push(`^((?!(?:${sanitized})).)*$`);
        if (this.config.collectCoverage) {
            const coverageFiles = fileFinder(
                path.join(process.cwd(), 'src'),
                new RegExp(sanitized, 'ig'),
                /\.css|\.scss?$/ig
            );

            if (coverageFiles.length) {
                this.config.collectCoverageOnlyFrom = {};
                coverageFiles.forEach((file) => {
                    this.config.collectCoverageOnlyFrom[file] = true;
                });
            }
        }
    }

    _getProjectFilePath(filepath) {
        return path.resolve(path.relative(this.rootPath, path.join(__dirname, filepath)));
    }

}

export default JestExRunner;
