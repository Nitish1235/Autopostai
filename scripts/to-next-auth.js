const fs = require('fs')
const path = require('path')

const nextAuthImports = `import { getServerSession } from "next-auth"\nimport { authOptions } from "@/lib/auth"`
const nextAuthLogic = `const session = await getServerSession(authOptions)\n    const userId = session?.user?.id`

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let changed = false

    if (content.includes("from '@clerk/nextjs/server'") || content.includes("await auth()")) {
      content = content.replace(/import \{ auth \} from '@clerk\/nextjs\/server'/g, nextAuthImports)
      content = content.replace(/const \{ userId \} = await auth\(\)/g, nextAuthLogic)
      content = content.replace(/const \{ userId \|\| '' \} = await auth\(\)/g, nextAuthLogic)
      changed = true
    }

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8')
      console.log(`Updated: ${filePath}`)
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err)
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      walkDir(fullPath)
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      replaceInFile(fullPath)
    }
  }
}

walkDir('./app/api')
