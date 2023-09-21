import { spawn } from 'child_process'
import { HttpContext, print } from 'easy-https-server'
import * as fs from 'fs'
import * as fsp from 'fs/promises'
import * as path from 'path'

async function callAndGetOutput(command: string, args: string[], pathname: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args)

    let output = ''

    fs.createReadStream(pathname).pipe(child.stdin)

    child.stdout.on('data', (data) => {
      output += data
    })

    child.stdout.on('end', () => {
      resolve(output)
    })
  })
}

export async function serveD2(_req: HttpContext['req'], res: HttpContext['res'], d2filename: string) {
  res.writeHead(200)
  const pathname = path.join(__dirname, '..', '..', 'pages', 'd2.html')
  const html = await fsp.readFile(pathname, 'utf-8')
  res.end(html.replace('var FILENAME', `var FILENAME = "${d2filename}"`))
}

export function sseD2(req: HttpContext['req'], res: HttpContext['res']) {
  const filename = new URL(req.url, 'http://test.test/').searchParams.get('filename')!

  let watchTimeout: any
  const debounceSendD2 = () => {
    clearTimeout(watchTimeout)
    watchTimeout = setTimeout(sendD2, 500)
  }

  const sendD2 = async () => {
    const layout = 'elk'
    const themeNumber = 200
    const sketch = false
    const args: string[] = [
      `--layout=${layout}`,
      `--theme=${themeNumber}`,
      `--sketch=${sketch}`,
      "-",
    ]

    const payload = await callAndGetOutput('d2', args, filename)

    send(res, { type: 'render', payload })
  }

  fs.watchFile(filename, debounceSendD2)

  function send(res: HttpContext['res'], data?: any) {
    const payload = JSON.stringify(data)
    print('D2', 'send', res.socket.id, payload.slice(0, 15))
    return new Promise<any>(resolve => res.write(`data: ${payload}\n\n`, resolve))
  }

  res.writeHead(200, {
    connection: 'keep-alive',
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache, no-transform',
  })

  res.on('close', () => {
    fs.unwatchFile(filename, debounceSendD2)
  })

  sendD2()
}
