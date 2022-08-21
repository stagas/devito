import chalk from '@stagas/chalk'
import mime from 'mime-types'
import * as path from 'path'

const thru = (s: any) => s

const colors = {
  GET: chalk.grey,
  POST: chalk.yellow,
  INF: chalk.cyan,
  LSN: chalk.blue,
  OPN: chalk.cyan,
  '200': chalk.blue,
  '304': chalk.yellow,
  '404': chalk.red,
  '500': chalk.red,
} as const

export function contentType(filename: string) {
  return {
    'content-type': mime.contentType(path.basename(filename)) || 'application/octet-stream',
  }
}

export const logOptions = {
  quiet: false,
  localAddress: '',
}

export function log(...args: any[]) {
  return !logOptions.quiet && console.log(...args)
}

const secs = Intl.NumberFormat(void 0, { maximumFractionDigits: 3 })

let taskStart: Date | void = void 0

export function startTask(force = false) {
  taskStart = ((force || !taskStart) && new Date()) || taskStart
}

function printIdle() {
  hr(chalk.black, '-')
  if (taskStart) {
    const msg = ` ${secs.format((lastPrintTime.getTime() - taskStart.getTime()) / 1000)}s `
    const col = process.stdout.columns - msg.length
    log(`\x1B[1A\x1B[${col}C${chalk.black(msg)}`)
    taskStart = void 0
  }
}

const dateFmt = Intl.DateTimeFormat(void 0, {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  hour12: false,
  fractionalSecondDigits: 3,
})

let idleTimeout: any

let lastPrintTime: Date

export function print(s: any, ...rest: any[]) {
  clearTimeout(idleTimeout)
  idleTimeout = setTimeout(printIdle, 4000)
  const date = new Date()
  lastPrintTime = date
  return log(`${dateFmt.format(date)} ${(colors[s as keyof typeof colors] ?? thru)(s)}`, ...rest)
}

export function hr(chalk: (s: string) => string, dash = '─') {
  log(chalk(dash.repeat(process.stdout.columns ?? 0)))
  if (logOptions.localAddress) log(`\x1B[1A${chalk('> ' + logOptions.localAddress)} `)
}
