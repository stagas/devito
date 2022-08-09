import mime from 'mime-types'
import * as path from 'path'

export function contentType(filename: string) {
  return {
    'content-type': mime.contentType(path.basename(filename)) || 'application/octet-stream',
  }
}
