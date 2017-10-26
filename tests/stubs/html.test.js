jest.unmock('../../src/stubs/html.js');

import stub from '../../src/stubs/html';

describe('Stubs: HTML', () => {
  it('should return a valid HTML string', () => {
    // eslint-disable-next-line no-useless-escape
    expect(stub).toMatch(/^<[A-Za-z\-]+>(.*?)<\/[A-Za-z\-]+>$/);
  });
});
