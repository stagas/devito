import { transformFromAstSync } from '@babel/core'
import generator from '@babel/generator'
import { parse } from '@babel/parser'
import traverse, { NodePath } from '@babel/traverse'
import * as t from '@babel/types'
import { OnLoadArgs, OnLoadResult, Plugin } from 'esbuild'
import { readFile } from './core'
import { logIt } from './esbuild-plugins'

const ignoredCallExpressions = new Set([
  'printer',
  'print',
  // 'info',
  // 'group',
  // 'groupEnd',
  // 'error',
])

const ignoredObjects = new Set([
  'console',
])

function d2Parser(filePath: string, source: string) {
  const ast = parse(source, {
    sourceType: 'module',
    sourceFilename: filePath,
    plugins: [
      'typescript'
    ]
  })

  const skipNode = (y: t.Node) => {
    t.traverseFast(y, x => {
      visited.add(x)
    })
    visited.add(y)
    return y
  }

  const skipNodes = (n: t.Node[]) => {
    n.forEach(skipNode)
    visited.add(n)
    return n as any[]
  }

  const skip = (n: t.Node | t.Node[]): any => {
    if (Array.isArray(n)) return skipNodes(n)
    else return skipNode(n)
  }

  const skipOne = (n: t.Node): any => {
    visited.add(n)
    return n
  }

  const nodesFrom = (text: string): any =>
    skip(parse(text).program.body)
  // const wrap = (n: NodePath, s: string) => {
  //   const text = JSON.stringify(s)
  //   n.insertBefore(nodesFrom(printIt('">"', text)))
  //   n.insertAfter(nodesFrom(printIt('"<"', text)))
  // }

  const wrapInTry = (s: string, n: any[]): any => {
    const text = JSON.stringify(s)
    return skipOne(t.tryStatement(
      t.blockStatement(
        [...nodesFrom(logIt('">"', text)), ...n]
      ),
      null,
      t.blockStatement(
        [...nodesFrom(logIt('"<"', text))]
      ),
    ))
  }

  const wrapCallExpression = (s: string, n: any): any => {
    const text = JSON.stringify(s)
    return skip(t.callExpression(
      t.arrowFunctionExpression([
        t.identifier('_result')
      ],
        skip(t.blockStatement([
          t.tryStatement(
            t.blockStatement(
              [
                ...nodesFrom(logIt('">"', text)),
                t.expressionStatement(
                  t.assignmentExpression('=',
                    t.identifier('_result'),
                    n.node
                  )
                )
              ],
            ),
            null,
            t.blockStatement(
              [...nodesFrom(logIt('"<"', text))]
            ),
          ) as any,
          t.returnStatement(
            t.identifier('_result')
          ) as any
        ]))
      ),
      []
    ))
  }

  let i = 0
  const visited = new Set()
  const realSrc = new Map()
  const src = (n: any) => {
    const s = realSrc.get(n) ?? generator(n).code
    realSrc.set(n, s)
    return s
  }

  traverse(ast, {
    enter(n) {
      if (visited.has(n.node)) return
      const p = n.parentPath
      const p1 = p
      const p2 = p?.parentPath
      const p3 = p2?.parentPath
      const p4 = p3?.parentPath
      const p5 = p4?.parentPath
      if (n?.node.type === 'IfStatement') {
        src(n.node.test)
        if (n.parent.type !== 'IfStatement' && n.parent.type !== 'TryStatement') {
          const label = 'if ' + generator(n.node.test).code
          visited.add(n.node)
          n.replaceWith(wrapInTry(label, [n.node]))
        }
      }
      else if (p?.node.type === 'IfStatement') {
        let y = p
        let r: any
        while (y.node.type === 'IfStatement') {
          r = y
          y = y.parentPath!
        }
        const mainTest = src(r.node.test)

        const label =
          (p2!.node.type === 'IfStatement' && p2!.node.alternate === p.node)
            ? p.node.alternate === n.node ? mainTest + ' ELSE:ELSE'
              : 'ELSE IF ' + src(p!.node.test) + ':ELSE IF'
            : (p.node.consequent === n.node ? 'IF ' + src(p.node.test) + ':IF'
              : mainTest + ' ELSE' + ':ELSE')

        if (n.node.type === 'ExpressionStatement') {
          n.replaceWith(wrapInTry(label, [n.node]))
        }
        else if (n.node.type === 'BlockStatement') {
          n.node.body = [wrapInTry(label, n.node.body)]
        }
      }
      else if (p4?.node.type === 'ClassDeclaration' || p3?.node.type === 'ClassDeclaration') {
        visited.add(n.node)

        let label: string
        if (p4?.node.type === 'ClassDeclaration' && p1!.node.type === 'ArrowFunctionExpression') {
          label = (p2 as any)!.node.key.name
        }
        else if (p3?.node.type === 'ClassDeclaration' && p1!.node.type === 'ClassMethod') {
          label = (p1 as any)!.node.key.name
        }
        else {
          return
        }

        if (n.node.type === 'BlockStatement') {
          n.visit()
          n.replaceWith(t.blockStatement([wrapInTry(label, [n.node])]) as any)
          n.skip()
        }
      }
      else if (n.node.type === 'BlockStatement') {
        if (p!.node.type === 'FunctionDeclaration' && !visited.has(p!.node)) {
          n.node.body = [wrapInTry(p!.node!.id!.name, n.node.body)]
        }
      }
      else if (n.node.type === 'CallExpression') {
        if (p!.type === 'TryStatement') return

        const objectName = (n as any).node.callee?.object?.name
        if (objectName && ignoredObjects.has(objectName)) return

        const name = (n as any).node.callee?.property?.name
          ?? (n as any).node.callee?.name

        if (!name) return
        if (ignoredCallExpressions.has(name)) return

        const label = src(n.node)
          .split('(')[0]
          .replaceAll(/[^a-z0-9\._ ]/gim, ' ')
          .replaceAll('this.', '')
          .replaceAll('.', ' ․')
        // const label = [objectName, name].filter(Boolean).join('․')
        // console.log('YES', label, src(n.node))
        visited.add(n.node)
        n.visit()
        n.skip()
        n.replaceWith(wrapCallExpression(label, n))
        // n.skip()
      }
    },
  })

  const res = transformFromAstSync(ast, source, {
    retainLines: true
  })!
  source = res.code!
  // console.log(source)
  return source
}

async function get(pathname: string, contents?: string) {
  contents ??= await readFile(pathname)

  if (contents.includes('print = printer')) {
    try {
      contents = d2Parser(pathname, contents)
    } catch (error) {
      console.error(error)
    }
  }

  return {
    contents,
    loader: 'js',
  } as OnLoadResult
}

export const d2Plugin = {
  name: 'astParser',
  setup(build, { transform } = {} as any) {
    const transformContents = async ({ args, contents }: { args: OnLoadArgs; contents: string }) => {
      const item = await get(args.path, contents)
      return item
    }

    if (transform) return transformContents(transform)

    build.onLoad({ filter: /\.js$/ }, async (args) => {
      const contents = await readFile(args.path)
      console.log(args.namespace)
      return transformContents({ args, contents })
    })
  },
} as Plugin
