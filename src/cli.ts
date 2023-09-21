#!/usr/bin/env node

import 'source-map-support/register'

import { decarg } from 'decarg'
import { devito, DevitoOptions } from '.'

const options = decarg(new DevitoOptions())!

const main = async () => {
  const { close } = await devito(options)
  process.on('SIGINT', () => {
    console.log('shutting down server')
    close()
    process.exit(1)
  })
}

process.on('uncaughtException', (error) => {
  console.warn(error)
})

process.on('unhandledRejection', (error) => {
  console.warn(error)
})

main()
