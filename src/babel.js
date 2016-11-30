import * as babel from 'babel-core';
import jestPreset from 'babel-preset-jest';
/**
 * The reason for this file is so I can test the transform class. In order to validate if it
 * can transform the files, I would need a mock of Babel, but if I mock it, the tests wouldn't
 * work.
 * @ignore
 */
export default babel;
/**
 * Babel preset for all Jest plugins
 * @type {Object}
 * @ignore
 */
export const preset = jestPreset;
