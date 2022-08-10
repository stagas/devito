#!/usr/bin/env node

import { decarg } from 'decarg'
import { devito, DevitoOptions } from '.'

const options = decarg(new DevitoOptions({ forceExit: true }))!

const main = async () => {
  const { close } = await devito(options)
  process.on('SIGINT', () => {
    console.log('shutting down server')
    close()
  })
}

main()
