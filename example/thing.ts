import { printer, writeD2 } from 'utils'

// @ts-ignore
const print = printer(import.meta.url)

const queue = new Set()
function util() {
  if (true) {
    console.log('util')
  }
  else {
    console.log('util')
  }
}

class Foo {
  foo = () => {
    console.log('foo')
  }

  bar() {
    console.log('bar')
    queue.add('bar')
  }

  zoo() {
    console.log('zoo')
    util()
  }

  expr() {
    console.log('expr')
  }
}

export function test() {
  // @env browser
  writeD2()
  describe('test', () => {
    it('works', () => {
      const foo = new Foo()
      foo.foo()
      foo.bar()
      const some = { foo }

      const doit = (x: boolean, y: boolean) => {
        // something
        if (x && y) {
          foo.bar()
        }
        else if (y) foo.expr()
        else if (x) {
          foo.foo()
        } else {
          foo.zoo()
        }
      }

      doit(true, true)
      doit(false, true)
      doit(true, false)
      doit(false, false)

      some.foo.bar()
    })
  })

}
