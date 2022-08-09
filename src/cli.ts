#!/usr/bin/env node

import { decarg } from 'decarg'
import { devito, DevitoOptions } from '.'

const options = decarg(new DevitoOptions())!

devito(options)
