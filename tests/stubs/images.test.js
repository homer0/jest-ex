jest.unmock('../../src/stubs/images.js');

import stub from '../../src/stubs/images';
import 'jasmine-expect';

describe('Stubs: Images', () => {
    it('should return an object with dummy information', () => {
        expect(stub).toBeObject();
        expect(Object.keys(stub)).toEqual(['path', 'uri', 'width', 'height']);
        expect(stub.path).toBeString();
        expect(stub.uri).toBeString();
        expect(stub.width).toBeNumber();
        expect(stub.height).toBeNumber();
    });
});
