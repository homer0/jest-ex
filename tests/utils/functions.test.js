jest.unmock('../../src/utils/functions');

import utils from '../../src/utils/functions';

describe('Utility functions', () => {
    it('should escape a string to be used as a regular expression', () => {
        const invalid = './some-path/';
        const valid = '\\./some\\-path/';
        const result = utils.escapeRegex(invalid);
        expect(result).toBe(valid);
    });
});
