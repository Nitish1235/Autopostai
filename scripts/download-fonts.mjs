import fs from 'fs'
import path from 'path'
import https from 'https'

const fonts = [
  { name: 'Anton-Regular.ttf', url: 'https://cdn.jsdelivr.net/npm/@fontsource/anton@5.0.8/files/anton-latin-400-normal.woff' },
  { name: 'Inter-Regular.ttf', url: 'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.8/files/inter-latin-400-normal.woff' },
  { name: 'BebasNeue-Regular.ttf', url: 'https://cdn.jsdelivr.net/npm/@fontsource/bebas-neue@5.0.12/files/bebas-neue-latin-400-normal.woff' },
  { name: 'Caveat-Regular.ttf', url: 'https://cdn.jsdelivr.net/npm/@fontsource/caveat@5.0.20/files/caveat-latin-400-normal.woff' },
  { name: 'PlayfairDisplay-Regular.ttf', url: 'https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5.0.21/files/playfair-display-latin-400-normal.woff' },
  { name: 'JetBrainsMono-Regular.ttf', url: 'https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5.0.20/files/jetbrains-mono-latin-400-normal.woff' },
  { name: 'Nunito-Regular.ttf', url: 'https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.0.13/files/nunito-latin-400-normal.woff' },
  { name: 'BarlowCondensed-Regular.ttf', url: 'https://cdn.jsdelivr.net/npm/@fontsource/barlow-condensed@5.0.13/files/barlow-condensed-latin-400-normal.woff' },
  { name: 'CormorantGaramond-Regular.ttf', url: 'https://cdn.jsdelivr.net/npm/@fontsource/cormorant-garamond@5.0.12/files/cormorant-garamond-latin-400-normal.woff' },
  { name: 'PermanentMarker-Regular.ttf', url: 'https://cdn.jsdelivr.net/npm/@fontsource/permanent-marker@5.0.12/files/permanent-marker-latin-400-normal.woff' },
  { name: 'Impact.ttf', url: 'https://cdn.jsdelivr.net/npm/@fontsource/anton@5.0.8/files/anton-latin-400-normal.woff' },
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
