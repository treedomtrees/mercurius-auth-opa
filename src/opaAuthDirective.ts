import { readFileSync } from 'fs'
import { join } from 'path'

export const opaAuthDirective = readFileSync(
  join(__dirname, 'opaAuthDirective.gql'),
  {
    encoding: 'utf-8',
  }
)
