/**
 * Escape a string you want to use on a regular expression so it won't contain invalid
 * characters/symbols.
 *
 * @example
 * console.log(escapeRegex('./some-path/'));
 * // It would output '\\./some\\-path/'
 *
 * @param  {String} s The string to escape
 * @return {String} The escaped string.
 */
const escapeRegex = s => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

export default {
  escapeRegex,
};
