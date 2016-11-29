import path from 'path';
import * as babel from 'babel-core';
import jestPreset from 'babel-preset-jest';
import glob from 'glob';

class JestExTransformer {

    constructor() {
        this.rootPath = path.resolve(process.cwd());
        this.invisibleLines = [
            'return obj && obj.__esModule ? obj : { default: obj };',
            /((?:var _this(\d+)? =|return) .*?\.__proto__ \|\| \(\d+, _getPrototypeOf.*?\n)/,
        ];
        this.ignoreLineComment = 'istanbul ignore next';
        this.filepath = '';
        this.code = '';

        this.process = this.process.bind(this);
    }

    process(src, filename) {
        let result = '';
        if (filename.match(/\.[js|jsx]+$/)) {
            this.code = src;
            this.filepath = filename;
            if (babel.util.canCompile(filename)) {
                this._formatSpecialPaths(filename);
                this._expandUnmockPaths(filename);

                this.code = babel.transform(this.code, {
                    auxiliaryCommentBefore: ` ${this.ignoreLineComment} `,
                    filename,
                    presets: [jestPreset],
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

    _escapeRegex(text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    _ignoreLine(line) {
        if (typeof line === 'string') {
            const regex = new RegExp(this._escapeRegex(line), 'g');
            this.code = this.code.replace(regex, `/* ${this.ignoreLineComment} */ ${line}`);
        } else {
            this.code = this.code.replace(line, `/* ${this.ignoreLineComment} */ $1`);
        }
    }

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
