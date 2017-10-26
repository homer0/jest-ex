jest.unmock('../../src/utils/fileFinder');
jest.mock('fs');

import fs from 'fs';
import fileFinder from '../../src/utils/fileFinder';

describe('fileFinder', () => {
  it('should find a list of files', () => {
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

    const result = fileFinder('./', /afile/);
    expect(result).toEqual(['afile.js', 'afile.css']);
  });

  it('should find a list of files thru a serie of sub directories', () => {
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

    const result = fileFinder('./', /\.js/);
    expect(result).toEqual(['afile.js', 'subfolder/bfile.js']);
  });

  it('should find a list of files and ignore files based on a pattern', () => {
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

    const result = fileFinder('./', /afile/, /\.css/);
    expect(result).toEqual(['afile.js']);
  });

  it('should \'search\' even if it gets a file as path', () => {
    fs.existsSync.mockReturnValueOnce(true);
    fs.statSync.mockReturnValueOnce({ isFile() { return true; } });
    const result = fileFinder('./afile.js', /file/);
    expect(result).toEqual(['./afile.js']);
  });

  it('shouldn\'t \'search\' if the path doesn\'t exist', () => {
    fs.existsSync.mockReturnValueOnce(false);
    const result = fileFinder('./afile.js', /file/);
    expect(result).toEqual([]);
  });
});
