import type { FileCount, ImportCount } from './count';

export const importsAsText = (importCounts: ImportCount[]) => {
  return importCounts.map((importCount) => {
    if (importCount.kind === 'default') {
      return `import ${importCount.ident} from "${importCount.mod}": ${importCount.count}`;
    } else if (importCount.kind === 'namespace') {
      return `import * as ${importCount.ident} from "${importCount.mod}": ${importCount.count}`;
    } else {
      return `import { ${importCount.ident} } from "${importCount.mod}": ${importCount.count}`;
    }
  });
};

export const filesAsText = (fileCounts: FileCount[]) => {
  return fileCounts.map((fileCount) => {
    return `${fileCount.path}: ${fileCount.count}`;
  });
};

export const importsAsJson = (importCounts: ImportCount[]) => {
  const json = importCounts.reduce((acc, importCount) => {
    const imp = {
      count: importCount.count,
      ident: importCount.ident,
      kind: importCount.kind,
    };

    const modImports = acc[importCount.mod];

    if (modImports == null) {
      acc[importCount.mod] = [imp];
    } else {
      modImports.push(imp);
    }

    return acc;
  }, {} as { [mod: string]: Omit<ImportCount, 'mod'>[] });

  return JSON.stringify(json);
};

export const filesAsJson = (fileCounts: FileCount[]) => {
  return JSON.stringify(fileCounts);
};
