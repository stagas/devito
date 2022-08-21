import chalk from '@stagas/chalk'
import * as http from 'http'
import * as https from 'https'
import { print } from './util'

type Promised<T, U extends unknown[] = unknown[]> = (...args: U) => Promise<T>

const promisify = (fn: any) => {
  return function(this: any, ...args: any[]) {
    return new Promise<any>((resolve, reject) => {
      fn.call(this, ...args, (err: any, ...data: any[]) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
  }
}

export interface HttpListenOptions {
  startPort: number
  hostname?: string
  ipAddress?: string
  maxTries?: number
}
async function tryListen(
  this: https.Server,
  { startPort, hostname = 'localhost', ipAddress = '0.0.0.0', maxTries = 32 }: HttpListenOptions,
) {
  return new Promise<number>((resolve, reject) => {
    let port = startPort

    const cleanup = () => {
      this.off('listening', listeningHandler)
      this.off('error', errorHandler)
    }

    const listeningHandler = () => {
      cleanup()
      resolve(port)
    }

    const errorHandler = async (error: NodeJS.ErrnoException) => {
      if (!--maxTries) {
        cleanup()
        reject(error)
      } else if (error.code === 'EADDRINUSE') {
        this.listen(++port, ipAddress ?? hostname)
      } else {
        cleanup()
        reject(error)
      }
    }

    this.once('listening', listeningHandler)
    this.on('error', errorHandler)
    this.listen(startPort, ipAddress ?? hostname)
  })
}

export interface HttpServer extends https.Server {
  tryListen(options: HttpListenOptions): Promise<number>
}

export interface HttpContext {
  req: http.IncomingMessage & { url: string; socket: { id?: string | number } }
  res: http.ServerResponse & {
    socket: { id?: string | number }
    writeEarlyHints(earlyHintsLinks: string[]): Promise<void>
    sendRaw(text: string): Promise<void>
    promises: {
      end: Promised<(http.ServerResponse)['end']>
    }
  }
}

let id = 1

// https://github.com/nodejs/node/pull/44180
function writeEarlyHints(
  this: http.ServerResponse & { sendRaw: (text: string) => Promise<any> },
  earlyHintsLinks: string[],
) {
  return this.sendRaw(
    `HTTP/1.1 103 Early Hints\r\nLink: ${earlyHintsLinks.join(', ')}\r\n\r\n`
  )
}

function sendRaw(this: http.ServerResponse & { _writeRaw: any }, text: string) {
  return new Promise<void>(resolve => this._writeRaw(text, 'ascii', resolve))
}

export const createHttpsServer = (options: https.ServerOptions) => {
  const requests: ({ resolve: (context: HttpContext) => void; reject: () => void })[] = []

  const server = https.createServer(options) as HttpServer & {
    promises: {
      close(): Promise<void>
    }
  }

  const queued: any = []

  function onRequest(req: HttpContext['req'], res: HttpContext['res']) {
    Promise.resolve().then(() => {
      req.url ??= '/'
      req.socket.id = id++
      res.promises = {
        end: promisify(res.end.bind(res)),
      }

      const writeHead = res.writeHead
      res.writeHead = (statusCode: number, ...rest: any[]) => {
        print(statusCode, chalk.grey(req.method), chalk.whiteBright(req.url))
        return writeHead.call(res, statusCode, ...rest)
      }

      res.writeEarlyHints ??= writeEarlyHints
      res.sendRaw ??= sendRaw
      if (requests.length) requests.shift()!.resolve({ req, res })
      else queued.push({ req, res })
    })
  }

  server.on('request', onRequest)

  server.tryListen = tryListen

  server.promises = {
    close: promisify(server.close.bind(server)),
  }

  return {
    server,
    request: {
      async *[Symbol.asyncIterator]() {
        try {
          while (true) {
            yield new Promise<HttpContext>((resolve, reject) => {
              if (queued.length) {
                resolve(queued.shift())
              } else {
                requests.push({ resolve, reject })
              }
            })
          }
        } catch {}
      },
    },
  }
}
