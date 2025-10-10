// @ts-expect-error No types
import prettierConfig from '@tomer/prettier-config'
import prettier from 'prettier'
import ts from 'typescript'
import createTransformer from './transformer.ts'

export const transpileTypeScript = (
  tsCode: string,
  options?: { transform?: boolean },
): ReturnType<TypeScriptCompiler[`transpile`]> =>
  typeScriptCompiler.transpile(tsCode, options)

class TypeScriptCompiler {
  readonly #compilerHost: ts.CompilerHost
  readonly #sourceFilesByName = new Map<string, ts.SourceFile>()
  readonly #sourceFileByContent = new Map<string, ts.SourceFile>()
  readonly #diagnostics = new Map<string, ts.Diagnostic[]>()

  public constructor() {
    this.#compilerHost = ts.createCompilerHost(compilerOptions)

    const originalGetSourceFile = this.#compilerHost.getSourceFile.bind(
      this.#compilerHost,
    )
    this.#compilerHost.getSourceFile = (
      fileName,
      languageVersion,
      onError,
      shouldCreateNewSourceFile,
    ) => {
      let sourceFile = this.#sourceFilesByName.get(fileName)
      if (sourceFile && !shouldCreateNewSourceFile) {
        return sourceFile
      }
      sourceFile = originalGetSourceFile(
        fileName,
        languageVersion,
        onError,
        shouldCreateNewSourceFile,
      )
      if (sourceFile) {
        this.#sourceFilesByName.set(fileName, sourceFile)
        this.#sourceFileByContent.set(sourceFile.getFullText(), sourceFile)
      }
      return sourceFile
    }
  }

  public async transpile(
    tsCode: string,
    { transform = false }: { transform?: boolean } = {},
  ): Promise<{
    transformedTsCode: string
    jsCode: string
    diagnostics: ts.Diagnostic[]
  }> {
    const sourceFile = this.#createSourceFile(tsCode)

    const program = ts.createProgram(
      [sourceFile.fileName],
      compilerOptions,
      this.#compilerHost,
    )
    const diagnostics: ts.Diagnostic[] = []

    let transformedTsCode: string
    if (transform) {
      const transformerExtras: ts.TransformerExtras = {
        ts,
        library: `typescript`,
        addDiagnostic: diagnostic => diagnostics.push(diagnostic),
        removeDiagnostic: index => diagnostics.splice(index, 1),
        diagnostics,
      }
      const transformResult = ts.transform(
        sourceFile,
        [createTransformer(program, {}, transformerExtras)],
        compilerOptions,
      )
      diagnostics.push(...(transformResult.diagnostics ?? []))
      try {
        transformedTsCode = ts
          .createPrinter()
          .printFile(transformResult.transformed[0]!)
      } finally {
        transformResult.dispose()
      }

      transformedTsCode = await prettier.format(transformedTsCode, {
        ...(prettierConfig as prettier.Options),
        filepath: sourceFile.fileName,
      })
    } else {
      transformedTsCode = tsCode
    }

    const transpileResult = ts.transpileModule(transformedTsCode, {
      compilerOptions,
    })

    diagnostics.push(
      ...this.#getDiagnostics(program, sourceFile),
      ...program.getGlobalDiagnostics(),
      ...(transpileResult.diagnostics ?? []),
    )

    return {
      transformedTsCode,
      jsCode: transpileResult.outputText,
      diagnostics,
    }
  }

  #createSourceFile(content: string): ts.SourceFile {
    let sourceFile = this.#sourceFileByContent.get(content)
    if (sourceFile) {
      return sourceFile
    }

    const fileName = `${fixturesPath}/test${this.#sourceFilesByName.size}.ts`
    sourceFile = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.ESNext,
      true,
    )
    this.#sourceFilesByName.set(fileName, sourceFile)
    this.#sourceFileByContent.set(content, sourceFile)
    return sourceFile
  }

  #getDiagnostics(
    program: ts.Program,
    sourceFile: ts.SourceFile,
  ): ts.Diagnostic[] {
    const cacheKey = `${sourceFile.fileName}:${sourceFile.text}`
    if (this.#diagnostics.has(cacheKey)) {
      return this.#diagnostics.get(cacheKey)!
    }

    const diagnostics = [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile),
    ]
    this.#diagnostics.set(cacheKey, diagnostics)
    return diagnostics
  }
}
const compilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  lib: [`lib.esnext.full.d.ts`],
}

const typeScriptCompiler = new TypeScriptCompiler()

export const formatDiagnostic = (diagnostic: ts.Diagnostic): string =>
  ts.formatDiagnostic(diagnostic, formatDiagnosticsHost).trim()

const fixturesPath = `${import.meta.dirname}/fixtures`
const formatDiagnosticsHost: ts.FormatDiagnosticsHost = {
  getCurrentDirectory: () => fixturesPath,
  getCanonicalFileName: fileName => fileName,
  getNewLine: () => `\n`,
}
