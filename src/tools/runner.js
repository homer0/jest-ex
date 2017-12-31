/* eslint-disable global-require */
import path from 'path';
import yargs from 'yargs';
import jestCLI from '../jest';
import utils from '../utils/functions';
import fileFinder from '../utils/fileFinder';
/**
* The Jest-Ex Runner is just a utility that uses the JestCLI defaults runner but it also allows you
* to have some extra functionality and have some defaults that are probably not that important to
* you.
*/
class JestExRunner {
  /**
  * Class constructor.
  * @param    {Object|String} config                 This can be either and object with your Jest
  *                                                  configuration or the path to the
  *                                                  configuration file, relative to where the
  *                                                  tests are run (`process.cwd()`).
  * @param    {Object}        [options={}]           Optional. A set of preferences for the
  *                                                  runner.
  * @property {Boolean}       [runInParallel=true]   Optional. Whether you want the tests to run
  *                                                  in parallel or not.
  * @property {Boolean}       [cache=false]          Optional. Whether you want to use Jest's
  *                                                  cache or not.
  * @property {Boolean}       [addTransformer=false] Optional. If you want the runner to
  *                                                  automatically add the Jest-Ex Transformer to
  *                                                  your configuration.
  * @property {Boolean}       [addStubs=false]       Optional. If you want the runner to
  *                                                  automatically add the Jest-Ex's stubs to
  *                                                  your configuration.
  * @return {JestExRunner} A new instance of the runner.
  */
  constructor(config, {
    runInParallel,
    cache,
    addTransformer,
    addStubs,
  } = {}) {
    /**
    * The absolute path to where the script that called the runner was executed.
    * @type {String}
    */
    this.rootPath = path.resolve(process.cwd());
    /**
    * This dictionary will hold the Jest configuration and its possible modifications.
    * The reason this is initialized empty it's because it can be either assigned, if the user
    * sent an object as argument, or `require`d, if the user sent the just the path.
    * @type {Object}
    */
    this.config = {};
    if (typeof config === 'string') {
      this.config = require(path.join(this.rootPath, config));
    } else {
      this.config = Object.assign({}, config);
    }
    /**
    * Whether the tests are going to run one at a time, or in parallel. The Jest-Ex runner
    * exposes the option as 'in parallel' (because IMO it's more clear), but the actual name
    * on the Jest configuration is `runInBand`..
    * @type {Boolean}
    */
    this.runInBand = !runInParallel;
    /**
    * Whether the Jest runner will use cache or not.
    * @type {Boolean}
    */
    this.cache = !!cache;
    /**
    * A dictionary with the regular expressions for the stubs. The reason this is exposed it's
    * because in case you are using other format of stylesheets, or your templates have another
    * extension, you can change the expression.
    * @type {Object}
    */
    this.stubsRegexs = {
      images: '^[\\.\\/a-zA-Z0-9$_-]+\\.(jpe?g|png|gif|svg)$',
      styles: '^[\\.\\/a-zA-Z0-9$_-]+\\.s?css$',
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
  /**
  * This method is used in case you want to manually add the stubs you want
  * @param {Array} [stubs=['images', 'styles', 'html']] Optional. The list of stubs you want to
  *                                                     inject in your configuration. The only
  *                                                     ones available, for now, are: `images`,
  *                                                     `styles` and `html`.
  * @return {JestExRunner} The current instance of this object, so it can be chained to another
  *                        method.
  */
  addStubs(stubs = ['images', 'styles']) {
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
  /**
  * Run the runner :D!
  * @return {Promise} Once the Jest runner finishes, this promise will be either resolved, if
  *                   everything went well, or rejected, if something happend.
  */
  run() {
    const config = this._getFormattedConfig();
    return jestCLI.runCLI(config, [config.rootDir])
    .then(data => (data.results.success ? data : Promise.reject(data)));
  }
  /**
  * Inject the path of the Jest-Ex Transformer to the Jest configuration. The transformer only
  * runs with `.js` and `.jsx` files.
  * This method is called from the constructor and only if the `addTransformer` option was set to
  * true.
  * @ignore
  */
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
  /**
  * Given a list of files, this method will create a native regular expression so the runner
  * will ignore every test file that doesn't match your files. In case you are also collecting
  * coverage, this method will also try to find the source file for the test(s) you want to run,
  * and limit the coverage only to that/those file(s).
  * This is called from the constructor and only if the `yargs` module detected a `--files`
  * argument being used on the instruction that executed the runner.
  * @param {String} files A comma separated list of files you intend to match with your test
  *                       cases.
  * @ignore
  */
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
  /**
  * A utility function to get the path of one of the project files, relative to this one.
  * @param {String} filepath The relative path to a file the runner intend to add to the Jest
  *                          configuration.
  * @return {String} The absolute path to a project file relative to this file.
  * @ignore
  */
  _getProjectFilePath(filepath) {
    return path.resolve(path.relative(this.rootPath, path.join(__dirname, filepath)));
  }
  /**
   * Prepares the configuration to be sent to Jest by adding the options for cache and parallel
   * runs; then, it converts any dictionary on the configuration to JSON string, because that's
   * the way Jest accepts them.
   * @return {Object} A configuration dictionary that can be used on the Jest `runCLI` method.
   */
  _getFormattedConfig() {
    const config = Object.assign({}, this.config, {
      rootDir: this.rootPath,
      runInBand: this.runInBand,
      cache: this.cache,
    });

    const stringified = {};
    Object.keys(config).forEach((key) => {
      const value = config[key];
      if (typeof value === 'object' && !Array.isArray(value)) {
        stringified[key] = JSON.stringify(value);
      }
    });

    return Object.assign({}, config, stringified);
  }
}

export default JestExRunner;
