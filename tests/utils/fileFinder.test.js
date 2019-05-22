jest.unmock('../../src/utils/fileFinder');
jest.mock('fs');

import path from 'path';
import fs from 'fs';
import fileFinder from '../../src/utils/fileFinder';

describe('fileFinder', () => {
  it('should find a list of files', () => {
    // Given
    fs.existsSync.mockReturnValueOnce(true);
    fs.statSync.mockReturnValueOnce({ isFile() { return false; } });
    fs.readdirSync.mockReturnValueOnce([
      'subfolder',
      'link',
      'afile.js',
      'afile.css',
    ]);
    fs.lstatSync.mockReturnValueOnce({
      isSymbolicLink() { return false; },
      isDirectory() { return true; },
    });
    fs.lstatSync.mockReturnValueOnce({
      isSymbolicLink() { return true; },
    });
    fs.lstatSync.mockReturnValueOnce({
      isSymbolicLink() { return false; },
      isDirectory() { return false; },
    });
    fs.lstatSync.mockReturnValueOnce({
      isSymbolicLink() { return false; },
      isDirectory() { return false; },
    });
    let result = null;
    // When
    result = fileFinder('./', /afile/);
    // Then
    expect(result).toEqual(['afile.js', 'afile.css']);
  });

  it('should find a list of files thru a serie of sub directories', () => {
    // Given
    fs.existsSync.mockReturnValueOnce(true);
    fs.statSync.mockReturnValueOnce({ isFile() { return false; } });
    fs.readdirSync.mockReturnValueOnce([
      'subfolder',
      'afile.js',
      'afile.css',
    ]);
    fs.lstatSync.mockReturnValueOnce({
      isSymbolicLink() { return false; },
      isDirectory() { return true; },
    });
    fs.lstatSync.mockReturnValueOnce({
      isSymbolicLink() { return false; },
      isDirectory() { return false; },
    });
    fs.lstatSync.mockReturnValueOnce({
      isSymbolicLink() { return false; },
      isDirectory() { return false; },
    });
    fs.existsSync.mockReturnValueOnce(true);
    fs.statSync.mockReturnValueOnce({ isFile() { return false; } });
    fs.readdirSync.mockReturnValueOnce([
      'bfile.js',
    ]);
    fs.lstatSync.mockReturnValueOnce({
      isSymbolicLink() { return false; },
      isDirectory() { return false; },
    });
    let result = null;
    // When
    result = fileFinder('./', /\.js/);
    // Then
    expect(result).toEqual(['afile.js', path.join('subfolder', 'bfile.js')]);
  });

  it('should find a list of files and ignore files based on a pattern', () => {
    // Given
    fs.existsSync.mockReturnValueOnce(true);
    fs.statSync.mockReturnValueOnce({ isFile() { return false; } });
    fs.readdirSync.mockReturnValueOnce([
      'afile.js',
      'afile.css',
    ]);
    fs.lstatSync.mockReturnValueOnce({
      isSymbolicLink() { return false; },
      isDirectory() { return false; },
    });
    fs.lstatSync.mockReturnValueOnce({
      isSymbolicLink() { return false; },
      isDirectory() { return false; },
    });
    let result = null;
    // When
    result = fileFinder('./', /afile/, /\.css/);
    // Then
    expect(result).toEqual(['afile.js']);
  });

  it('should \'search\' even if it gets a file as path', () => {
    // Given
    fs.existsSync.mockReturnValueOnce(true);
    fs.statSync.mockReturnValueOnce({ isFile() { return true; } });
    let result = null;
    // When
    result = fileFinder('./afile.js', /file/);
    // Then
    expect(result).toEqual(['./afile.js']);
  });

  it('shouldn\'t \'search\' if the path doesn\'t exist', () => {
    // Given
    fs.existsSync.mockReturnValueOnce(false);
    let result = null;
    // When
    result = fileFinder('./afile.js', /file/);
    // Then
    expect(result).toEqual([]);
  });
});
