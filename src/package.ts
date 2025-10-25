import * as pkg from 'empathic/package'
import ts from 'typescript'

export const isFromTypeToFastCheckPackage = (
  symbol: ts.Symbol,
  typeChecker: ts.TypeChecker,
): boolean => {
  if (symbol.flags & ts.SymbolFlags.Alias) {
    symbol = typeChecker.getAliasedSymbol(symbol)
  }

  return Boolean(
    symbol.declarations?.some(
      declaration =>
        findPackageJsonPath(declaration.getSourceFile().fileName) ===
        packageJsonPath,
    ),
  )
}

const findPackageJsonPath = (cwd: string): string | null => {
  let packageJsonPath = packageJsonPaths.get(cwd)
  if (packageJsonPath === undefined) {
    packageJsonPath = pkg.up({ cwd }) ?? null
    packageJsonPaths.set(cwd, packageJsonPath)
  }
  return packageJsonPath
}

const packageJsonPaths = new Map<string, string | null>()

const packageJsonPath = findPackageJsonPath(import.meta.dirname)
