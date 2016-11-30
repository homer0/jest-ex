# Jest-Ex

A runner and a transformer to simplify (a little bit) your work with Jest.

## The motivation

First I started with the transformer (the preprocessor at that time) because I was having issues with the code coverage where some _invisible lines_ weren't being tested so my reported showed as _incomplete_. Those lines were _Babel magic_, but Babel/Babel-Jest wasn't adding the Istanbul comment, so I started there, I made a preprocessor that would compile the script with Babel and add the comment for those _invisible lines_.

After that, and knowing that I had the power to make changes, I started noticing a few things that I didn't like about my tests, like (because I needed to for some cases) having to `jest.unmock` one by one all the files of a directory, when glob patterns are a really common thing on Node apps nowadays; other thing, and this is more Node related than Jest, the fact that because all `require`/`import` has to be relative to the test file, the file header was full of `../../..`. So, I built the ability to use glob patterns on `jest.unmock` and a special format for referencing path relatives to the root of your project.

Now, there was another feature I wanted from Jest, but that it was only partially available: Run only one specific test and collect the coverage just for that file. Jest allows you to specify one test, by sending a regular expression to the CLI command, but it doesn't affect the coverage report, so I test one class and I get a giant report with the coverage information for all the project files... not what I wanted.

The problem with this feature was that I couldn't add it from my preprocessor, I needed to add it before running the tests... thus, a custom runner. So I wrote a custom runner with my feature.

Finally, with my runner and transformer, I assumed I could connect them (make the runner automatically register the transformer) and publish it as a library.

## Information

| -            | -                                                                  |
|--------------|--------------------------------------------------------------------|
| Package      | jest-ex                                                 |
| Description  | A runner and a transformer to simplify (a little bit) your work with Jest. |
| Node Version | >= v4.3.0                                                          |

## Usage

### Runner

The runner is exported as a class, you just need to instantiate and tell it to `run()`, then you'll get a `Promise` that will get rejected or resolved depending on the success of the tests:

```js
import { JestExRunner } from 'jest-ex';
// const JestExRunner = require('jest-ex').JestExRunner

new JestExRunner('./jest.json')
.run()
.then(() => console.log('Yay! all the unit tests passed!'))
.catch(() => console.log('Something went wrong with the tests'));
```

That's the basic setup, but yes, there are some extra things you can do here:

```js
new JestExRunner('./jest.json', {
    addTransformer: true,
    addStubs: true,
    runInParallel: false,
    cache: false,
})
.run()
```

- `addTransformer`: If you set it to `true`, it will automatically add the Jest-Ex transformer to your Jest configuration.
- `addStubs`: It will modify your Jest configuration in order to add stubs for images, stylesheets and HTML files. Really useful for when you work with Webpack and have `require`s for this kind of files.
- `runInParallel`: Whether you want Jest to run the tests one by one or in parallel.
- `cache`: Whether you want to use the Jest cache or not.

Now, what about the feature of specifying the file and customizing the coverage? Well, that's built in inside the runner, just use the `--files` flag when you run your script from the CLI. For example, if you are executing your file from the NPM `test` task, you'll do something like this:

```
# You can send a regular expression or just part of the name
npm test -- --files someFile
```
Also, you can separate the values with a comma:

```
npm test -- --files fileA,fileB
```

And that's all, the runner will take care of the rest.

### Transformer

**Invisible lines**

The default implementation, the one the runner adds, just fixes two _invisible patterns_ I found, but in case you found more, you can instantiate the transformer by yourself and include it to the list:

```js
import { JestExTransformer } from 'jest-ex';
// const JestExTransformer = require('jest-ex').JestExTransformer

const transformer = new JestExTransformer();
transformer.invisibleLines.push('some-invisible-pattern');
// or
transformer.invisibleLines.push(/(some\-invisible\-pattern)/);

export const process = transformer.process;
```

**Unmock using glob patterns**

During a project, I had a test case that required part of the app to be _unmocked_, and having to call `jest.unmock` for each file didn't look right:

```js
jest.unmock('folder/fileA.js');
jest.unmock('folder/fileB.js');
jest.unmock('folder/fileC.js');
jest.unmock('folder/fileD.js');
```

So, thanks to the transformer, you can now do this:

```js
jest.unmock('folder/*.js')
```

That line will get expanded on the transform process and the result will be the same as the previous block.

You can also use the `!` on your pattern to ignore some results:

```js
jest.unmock('folder/*.js!fileB,fileD');
```

That would expand to:

```js
jest.unmock('folder/fileA.js');
jest.unmock('folder/fileC.js');
```

**Special paths**

As I mention at the beginning, this is more of Node thing, and IMO, it makes your tests headers a lot easier to read.

The transformer assumes that you run the script that executes the runner from your project root directory, and by assuming that, it allows you to use this kind of paths on your `require`/`import`/`unmock`/`mock`:

> [folder-on-the-root]:[path-to-your-file]

Let's see a few examples:

```js
// This file is on <root>/tests/folder/myfile.js

jest.unmock('src:tools/someTool');
// -> jest.unmock('../../tools/someTool');

jest.mock('src:utils/someUtils', () => {});
// -> jest.mock('../../utils/someUtils', () => {});

import someTool from 'src:tools/someTool';
// -> import someTool from '../../tools/someTool';

const someUtils = require('src:utils/someUtils');
// -> const someUtils = require('../../utils/someUtils');
```

Really simple, right?

## Development

Before doing anything, install the repository hooks:

```bash
npm run install-hooks
```

### NPM Tasks

| Task                    | Description                         |
|-------------------------|-------------------------------------|
| `npm run install-hooks` | Install the GIT repository hooks.   |
| `npm run build`         | Transpile the project with Babel.   |
| `npm test`              | Run the project unit tests.         |
| `npm run lint`          | Lint the project code.              |
| `npm run docs`          | Generate the project documentation. |

### Testing

Ironically, I use regular [Jest](https://facebook.github.io/jest/) to test the project. The configuration file is on `./.jestrc`, the tests and mocks are on `./tests` and the script that runs it is on `./utils/scripts/test`.

### Linting

I use [ESlint](http://eslint.org) to validate all our JS code. The configuration file is on `./.eslintrc`, there's also an `./.eslintignore` to ignore some files on the process, and the script that runs it is on `./utils/scripts/lint`.

### Documentation

I use [ESDoc](http://esdoc.org) to generate HTML documentation for the project. The configuration file ion `./.esdocrc` and the script that runs it is on `./utils/scripts/docs`.