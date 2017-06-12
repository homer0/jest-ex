import path from 'path';
import fs from 'fs';
import glob from 'glob';
import htmlLoader from 'html-loader';
import babel from '../babel';
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
         * A flag to indicate that `.js(x)` files will be parsed.
         * @type {Boolean}
         */
        this.processJS = true;
        /**
         * A flag to indicate that `.html` files will be parsed.
         * @type {Boolean}
         */
        this.processHTML = true;
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
        // Check which kind of file is
        const isJS = filename.match(/\.jsx?$/i);
        const isHTML = filename.match(/\.html$/i);

        // Check if the parser is enabled for the known file types
        const parseJS = this.processJS && isJS;
        const parseHTML = this.processHTML && isHTML;

        // If the file should be parsed...
        if (parseJS || parseHTML) {
            this.code = src;
            this.filepath = filename;

            if (parseJS) {
                this._parseJS();
            } else {
                this._parseHTML();
            }

            result = this.code;
        }

        return result;
    }
    /**
     * Parse the file that it's currently being processed as a JS file. This method will first
     * format the Jest-Ex special paths, expand the globs, transform it with Babel and finally
     * escape the _invisible lines_ for the coverage.
     * The changes won't be returned, but made on the current `this.code`.
     */
    _parseJS() {
        if (babel.util.canCompile(this.filepath)) {
            this._formatSpecialPaths(this.filepath);
            this._expandUnmockPaths(this.filepath);

            this.code = babel.transform(this.code, {
                auxiliaryCommentBefore: ` ${this.ignoreLineComment} `,
                filename: this.filepath,
                presets: [['es2015-node6', { modules: true }]],
                retainLines: true,
                plugins: ['transform-runtime'],
            }).code;

            this.invisibleLines.forEach(line => this._ignoreLine(line));
        }
    }
    /**
     * Parse the file that it's currently being processed as an HTML file. This method will first
     * read it from the file system and then use the Webpack HTML loader to format it as a
     * commonjs module.
     * The changes won't be returned, but made on the current `this.code`.
     */
    _parseHTML() {
        const contents = fs.readFileSync(this.filepath, 'utf-8');
        this.code = htmlLoader(contents);
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
                regex: /import (.*?) from '(?:\/(.+?)\/)(.*)';/ig,
                replacement: `import $1 from '${relative}/$2/$3';`,
            },
            {
                regex: /import ({\n(?:[\s\S]*?)}) from '(?:\/(.+?)\/)(.*)';/ig,
                replacement: `import $1 from '${relative}/$2/$3';`,
            },
            {
                regex: /jest.unmock\('(?:\/(.+?)\/)(.*)'\);/ig,
                replacement: `jest.unmock('${relative}/$1/$2');`,
            },
            {
                regex: /jest.(setMock|mock)\('(?:\/(.+?)\/)(.*)',/ig,
                replacement: `jest.$1('${relative}/$2/$3',`,
            },
            {
                regex: /require\('(?:\/(.+?)\/)(.*)'\)/ig,
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
