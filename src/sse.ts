import { HttpContext, print, logOptions } from 'easy-https-server'

export interface SSEContext {
  start: (req: HttpContext['req'], res: HttpContext['res']) => void
  clients: Set<HttpContext['res']>
  send: (client: HttpContext['res'], data?: any) => Promise<any>
  broadcast: (data?: any) => Promise<void>
}

export function SSE(): SSEContext {
  const clients = new Set<HttpContext['res']>()

  async function broadcast(data?: any) {
    const promises: Promise<any>[] = []
    for (const client of clients) {
      promises.push(send(client, data))
    }
    await Promise.allSettled(promises)
  }

  function send(res: HttpContext['res'], data?: any) {
    const payload = JSON.stringify(data)
    print('SSE', 'send', res.socket.id, payload)
    return new Promise<any>(resolve => res.write(`data: ${payload}\n\n`, resolve))
  }

  function start(req: HttpContext['req'], res: HttpContext['res']) {
    clients.add(res)
    print('SSE', 'open', req.socket.id, logOptions.extraInfo = `[${clients.size} clients]`)

    res.once('close', () => {
      clients.delete(res)
      print('SSE', 'close', req.socket.id, logOptions.extraInfo = `[${clients.size} clients]`)

      res.end()
    })

    req.socket.setNoDelay(true)

    res.writeHead(200, {
      connection: 'keep-alive',
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
    })

    send(res, { type: 'start' })
  }

  return {
    start,
    clients,
    send,
    broadcast,
  }
}
