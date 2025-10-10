import { AsyncLocalStorage } from 'node:async_hooks'
import type ts from 'typescript'
import type { TransformerExtras } from 'typescript'

const addDiagnosticStorage = new AsyncLocalStorage<
  TransformerExtras[`addDiagnostic`]
>()

export const addDiagnostic = (
  node: ts.Node,
  category: ts.DiagnosticCategory,
  text: string,
): void => {
  addDiagnosticStorage.getStore()!({
    category,
    code: `type-to-fast-check` as unknown as number,
    file: node.getSourceFile(),
    start: node.getStart(),
    length: node.getEnd() - node.getStart(),
    messageText: text,
  })
}

export const withAddDiagnostic = <T>(
  addDiagnostic: TransformerExtras[`addDiagnostic`],
  callback: () => T,
): T => addDiagnosticStorage.run(addDiagnostic, callback)

export const NEW_ISSUE_LINK = `https://github.com/TomerAberbach/type-to-fast-check/issues/new`
