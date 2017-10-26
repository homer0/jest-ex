import fs from 'fs';
import path from 'path';
/**
* This allows you to search for files inside specific folders.
* This function is based on the `find-file-sync` but updated with ES6 and improved so
* it will match the file names and the exclusions based on regular expression patterns.
*
* @example
* // This will look for all the js and jsx files.
* fileFilder(process.cwd(), /\.js|\.jsx?$/ig);
*
* // And this will look for a file that has `someModule` on the name, but that is not
* // a css file.
* fileFilder(process.cwd(), /someModule/ig, /\.css?$/ig);
*
* @param  {String} directory      The root path where the function will look for the
*                                 files.
* @param  {RegExp} searchPattern  The pattern the files have to match.
* @param  {RegExp} excludePattern Optional. A pattern that if matched, will act as a
*                                 flag to ignore the file.
* @return {Array} A list of the files it found.
*/
const fileFinder = (directory, searchPattern, excludePattern) => {
  const directories = [];
  let results = [];
  if (fs.existsSync(directory)) {
    if (fs.statSync(directory).isFile() && directory.match(searchPattern)) {
      results.push(directory);
    } else {
      const contents = fs.readdirSync(directory);
      for (let i = 0; i < contents.length; i++) {
        const item = contents[i];
        if (!excludePattern || !item.match(excludePattern)) {
          const fullpath = path.join(directory, item);
          const stat = fs.lstatSync(fullpath);
          if (!stat.isSymbolicLink()) {
            if (!stat.isDirectory()) {
              if (fullpath.match(searchPattern)) {
                results.push(fullpath);
              }
            } else {
              directories.push(fullpath);
            }
          }
        }
      }

      directories.forEach((dir) => {
        results = results.concat(fileFinder(dir, searchPattern, excludePattern));
      });
    }
  }

  return results;
};

export default fileFinder;
