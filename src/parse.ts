import { readFile } from 'fs/promises';
import { dirname, resolve } from 'path';

import { Parser as BaseParser } from 'acorn';
import acornJsx from 'acorn-jsx';
import type { Program } from 'estree';

import Counter from './count';

//https://regex101.com/r/wwMVRP/3
const pattern = new RegExp(
  /^import([ \n\t]*(?:[^ \n\t{}]+[ \n\t]*,?)?(?:[ \n\t]*\{(?:[ \n\t]*[^ \n\t"'{}]+[ \n\t]*,?)+\})?[ \n\t]*)from[ \n\t]*(['"])([^'"\n]+)(?:['"])/gm
);

export interface Ident {
  ident: string;
  kind: 'named' | 'default' | 'namespace';
}

export interface Import extends Ident {
  mod: string;
}

const Parser = BaseParser.extend(acornJsx());

const resolveImportSource = (
  rootPath: string,
  path: string,
  source: string
) => {
  if (source[0] === '.') {
    return resolve(dirname(path), source).replace(
      new RegExp(`${rootPath}/?`),
      './'
    );
  } else {
    return source;
  }
};

const trackImports = (
  body: Program['body'],
  rootPath: string,
  path: string,
  cb: (imp: Import) => void
) => {
  return body.forEach((node) => {
    if (node.type === 'ImportDeclaration') {
      if (typeof node.source.value == 'string') {
        for (const specifier of node.specifiers) {
          let ident;
          let kind;

          if (specifier.type === 'ImportSpecifier') {
            ident = specifier.imported.name;
            kind = 'named' as const;
          } else if (specifier.type === 'ImportDefaultSpecifier') {
            ident = specifier.local.name;
            kind = 'default' as const;
          } else {
            ident = specifier.local.name;
            kind = 'namespace' as const;
          }

          cb({
            mod: resolveImportSource(rootPath, path, node.source.value),
            ident,
            kind,
          });
        }
      }
    }
  }, [] as Import[]);
};

export const parsePaths = async (rootPath: string, paths: string[]) => {
  const counter = new Counter();

  for (const path of paths) {
    Object.assign(counter, await parsePath(rootPath, path, counter));
  }

  return counter;
};

export const parsePath = async (
  rootPath: string,
  path: string,
  counter = new Counter()
) => {
  const sourceCode = await readFile(path, 'utf8');
  const importSourceCode = sourceCode
    .match(pattern)
    ?.filter((str) => str.includes('@gupy'))
    .join(';');

  console.error(`${path}\n${importSourceCode}\n\n`);

  const root = Parser.parse(importSourceCode ? importSourceCode : '', {
    ecmaVersion: 'latest',
    sourceType: 'module',
  }) as unknown as Program;

  trackImports(root.body, rootPath, path, (imp) =>
    counter.increment(path, imp)
  );

  return counter;
};
