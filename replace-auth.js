const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace old import
    const oldImport = "import { auth } from '@/lib/auth/authOptions'";
    const newImport = "import { auth } from '@clerk/nextjs/server'";
    
    if (content.includes(oldImport)) {
      content = content.replace(newImport, ''); // Clean up if already added
      content = content.replace(oldImport, newImport);
      
      // Also, NextAuth auth() returns a session where we check `!session?.user?.id`
      // But Clerk auth() returns an object where we check `!userId`
      // We need to convert `const session = await auth()` -> `const { userId } = await auth()`
      content = content.replace(/const session = await auth\(\)/g, "const { userId } = await auth()");
      
      // Replace instances of `session?.user?.id` or `session.user.id` or `session?.user?.id` with `userId`
      content = content.replace(/session\?\.user\?\.id/g, "userId");
      content = content.replace(/session\.user\.id/g, "userId");
      content = content.replace(/!session/g, "!userId");
      content = content.replace(/session/g, "userId");
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir('./app/api');
