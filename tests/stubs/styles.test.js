jest.unmock('../../src/stubs/styles.js');

import stub from '../../src/stubs/styles';
import 'jasmine-expect';

describe('Stubs: Styles', () => {
  it('should return an object with dummy information', () => {
    expect(stub).toBeObject();
    expect(Object.keys(stub)).toEqual(['path', 'media']);
    expect(stub.path).toBeString();
    expect(stub.media).toBeString();
  });
});
