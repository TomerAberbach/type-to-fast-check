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

  public transpile(
    tsCode: string,
    { transform = false }: { transform?: boolean } = {},
  ): {
    transformedTsCode: string
    jsCode: string
    errorDiagnostics: string[]
  } {
    const sourceFile = this.#createSourceFile(tsCode)

    const program = ts.createProgram(
      [sourceFile.fileName],
      compilerOptions,
      this.#compilerHost,
    )
    const errorDiagnostics: ts.Diagnostic[] = []

    let transformedTsCode: string
    if (transform) {
      const transformResult = ts.transform(
        sourceFile,
        [createTransformer(program)],
        compilerOptions,
      )
      errorDiagnostics.push(...(transformResult.diagnostics ?? []))
      try {
        transformedTsCode = ts
          .createPrinter()
          .printFile(transformResult.transformed[0]!)
      } finally {
        transformResult.dispose()
      }
    } else {
      transformedTsCode = tsCode
    }

    const transpileResult = ts.transpileModule(transformedTsCode, {
      compilerOptions,
    })

    errorDiagnostics.push(
      ...this.#getDiagnostics(program, sourceFile),
      ...program.getGlobalDiagnostics(),
      ...(transpileResult.diagnostics ?? []),
    )

    return {
      transformedTsCode,
      jsCode: transpileResult.outputText,
      errorDiagnostics: errorDiagnostics
        .filter(
          diagnostic => diagnostic.category === ts.DiagnosticCategory.Error,
        )
        // eslint-disable-next-line typescript/no-base-to-string
        .map(diagnostic => String(diagnostic.messageText)),
    }
  }

  #createSourceFile(content: string): ts.SourceFile {
    let sourceFile = this.#sourceFileByContent.get(content)
    if (sourceFile) {
      return sourceFile
    }

    const fileName = `test${this.#sourceFilesByName.size}.ts`
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
