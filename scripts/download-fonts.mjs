import fs from 'fs'
import path from 'path'
import https from 'https'

const fonts = [
  { name: 'Anton-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf' },
  { name: 'Inter-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Regular.ttf' },
  { name: 'BebasNeue-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/BebasNeue-Regular.ttf' },
  { name: 'Caveat-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/caveat/static/Caveat-Regular.ttf' },
  { name: 'PlayfairDisplay-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-Regular.ttf' },
  { name: 'JetBrainsMono-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/jetbrainsmono/static/JetBrainsMono-Regular.ttf' },
  { name: 'Nunito-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/nunito/static/Nunito-Regular.ttf' },
  { name: 'BarlowCondensed-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/barlowcondensed/BarlowCondensed-Regular.ttf' },
  { name: 'CormorantGaramond-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/cormorantgaramond/CormorantGaramond-Regular.ttf' },
  { name: 'PermanentMarker-Regular.ttf', url: 'https://raw.githubusercontent.com/google/fonts/main/apache/permanentmarker/PermanentMarker-Regular.ttf' },
  { name: 'Impact.ttf', url: 'https://raw.githubusercontent.com/fedelibre/Impact-Font/master/impact.ttf' },
]

const dir = path.join(process.cwd(), 'assets', 'fonts')
fs.mkdirSync(dir, { recursive: true })

async function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return download(res.headers.location, dest).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${res.statusCode}`))
      }
      const file = fs.createWriteStream(dest)
      res.pipe(file)
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on('error', reject)
  })
}

async function main() {
  for (const font of fonts) {
    console.log(`Downloading ${font.name}...`)
    const dest = path.join(dir, font.name)
    await download(font.url, dest)
  }
  console.log('All fonts downloaded successfully!')
}

main().catch(console.error)
