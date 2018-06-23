jest.unmock('../../src/utils/functions');

import utils from '../../src/utils/functions';

describe('Utility functions', () => {
  it('should escape a string to be used as a regular expression', () => {
    // Given
    const invalid = './some-path/';
    const valid = '\\./some\\-path/';
    let result = null;
    // When
    result = utils.escapeRegex(invalid);
    // Then
    expect(result).toBe(valid);
  });
});
