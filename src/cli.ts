#!/usr/bin/env bun

import 'source-map-support/register'

import { decarg } from 'decarg'
import { devito, DevitoOptions } from './devito.ts'

const options = decarg(new DevitoOptions())!
console.log(options)
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
