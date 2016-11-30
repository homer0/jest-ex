import path from 'path';
import glob from 'glob';
import babel, { preset } from '../babel';
import utils from '../utils/functions';
/**
 * A Jest transfomer that fixes a few issues with Babel and add some 'features' you can use on your
 * tests.
 */
class JestExTransformer {
    /**
     * Class constructor.
     * @ignore
     */
    constructor() {
        /**
         * The absolute path to where the script that called the runner was executed.
         * @type {String}
         */
        this.rootPath = path.resolve(process.cwd());
        /**
         * A list of lines that I know Babel uses for classes, that are not ignored by Istanbul and
         * that may tell you that your coverage is incomplete.
         * The reason they are exposed it's because these are the ones I found, but if you find
         * others, you can push them to the list.
         * @type {Array}
         */
        this.invisibleLines = [
            'return obj && obj.__esModule ? obj : { default: obj };',
            /((?:var _this(\d+)? =|return) .*?\.__proto__ \|\| \(\d+, _getPrototypeOf.*?\n)/,
        ];
        /**
         * The required comment by Istanbul in order to ignore a line on the code coverage.
         * @type {String}
         */
        this.ignoreLineComment = 'istanbul ignore next';
        /**
         * Every time a file is transfomed, this will be its absolute path.
         * @type {String}
         */
        this.filepath = '';
        /**
         * Every time a file is transformed, this will be it's source code.
         * @type {String}
         */
        this.code = '';
        /**
         * This is binded so it will keep the context even after it gets sent to Jest.
         * @ignore
         */
        this.process = this.process.bind(this);
    }
    /**
     * This is the method Jest receives and the one that takes care of verifying and transforming
     * a file.
     * @param {String} src      The file source code.
     * @param {String} filename The file location.
     * @return {String} The transformed code.
     */
    process(src, filename) {
        let result = src;
        if (filename.match(/\.[js|jsx]+$/)) {
            this.code = src;
            this.filepath = filename;
            if (babel.util.canCompile(filename)) {
                this._formatSpecialPaths(filename);
                this._expandUnmockPaths(filename);

                this.code = babel.transform(this.code, {
                    auxiliaryCommentBefore: ` ${this.ignoreLineComment} `,
                    filename,
                    presets: [preset],
                    retainLines: true,
                    plugins: ['transform-runtime'],
                }).code;

                this.invisibleLines.forEach(line => this._ignoreLine(line));
                result = this.code;
            } else {
                result = src;
            }
        }

        return result;
    }
    /**
     * Given a specific line, it this method will find it on the code of the file that it's
     * currently being processed, and it will append the Istanbul comment to ignore it on the code
     * coverage.
     * The changes won't be returned, but made on the current `this.code`.
     * @param {String|RegExp} line The line to _ignore_. It can also be a regular expression.
     */
    _ignoreLine(line) {
        if (typeof line === 'string') {
            const regex = new RegExp(utils.escapeRegex(line), 'g');
            this.code = this.code.replace(regex, `/* ${this.ignoreLineComment} */ ${line}`);
        } else {
            this.code = this.code.replace(line, `/* ${this.ignoreLineComment} */ $1`);
        }
    }
    /**
     * Read and transform the custom path format Jest-Ex allows you to use. More information about
     * what they are and how to use them in the README.
     * The changes won't be returned, but made on the current `this.code`.
     */
    _formatSpecialPaths() {
        const relative = path.relative(path.dirname(this.filepath), this.rootPath);
        [
            {
                regex: /import (.*?) from '(.*):(.*)';/ig,
                replacement: `import $1 from '${relative}/$2/$3';`,
            },
            {
                regex: /import ({\n(?:[\s\S]*?)}) from '(.*):(.*)';/ig,
                replacement: `import $1 from '${relative}/$2/$3';`,
            },
            {
                regex: /jest.unmock\('(.*):(.*)'\);/ig,
                replacement: `jest.unmock('${relative}/$1/$2');`,
            },
            {
                regex: /jest.(setMock|mock)\('(.*):(.*)',/ig,
                replacement: `jest.$1('${relative}/$2/$3',`,
            },
            {
                regex: /require\('(.*):(.*)'\)/ig,
                replacement: `require('${relative}/$1/$2')`,
            },
        ].forEach((format) => {
            this.code = this.code.replace(format.regex, format.replacement);
        });
    }
    /**
     * Read and transform the `jest.unmock` that use glob patterns instead of file paths.
     * The changes won't be returned, but made on the current `this.code`.
     */
    _expandUnmockPaths() {
        const filedir = path.dirname(this.filepath);
        const regex = /jest.unmock\('(.*?\*.*?)'\)/ig;
        let match = regex.exec(this.code);
        while (match) {
            const globRoot = path.dirname(path.relative(this.rootPath, this.filepath));
            const [, globPattern] = match;
            let globPath = `${globRoot}/${globPattern}`;
            let ignoredList = [];

            if (globPath.includes('!')) {
                const [globPartsPath, globPartsIgnore] = globPath.split('!');
                globPath = globPartsPath;
                if (globPartsIgnore) {
                    ignoredList = globPartsIgnore.split(',');
                }
            }

            let lines = '';
            glob.sync(globPath).forEach((file) => {
                if (!ignoredList.filter(value => file.includes(value)).length) {
                    const fpath = path.relative(filedir, file);
                    lines += `\njest.unmock('${fpath}');`;
                }
            });

            this.code = this.code.replace(match[0], lines);
            match = regex.exec(this.code);
        }
    }

}

export default JestExTransformer;
