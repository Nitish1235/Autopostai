const fs = require('fs');

const path = 'app/api/script/generate/route.ts';
let content = fs.readFileSync(path, 'utf8');

const target = "    const { currentUser } = await import('@clerk/nextjs/server')\n    const user = await currentUser()\n    const email = user?.emailAddresses[0]?.emailAddress";
const replace = "    const email = session?.user?.email";

const targetCRLF = "    const { currentUser } = await import('@clerk/nextjs/server')\r\n    const user = await currentUser()\r\n    const email = user?.emailAddresses[0]?.emailAddress";

if (content.includes(target)) {
    content = content.replace(target, replace);
} else if (content.includes(targetCRLF)) {
    content = content.replace(targetCRLF, replace);
} else {
    console.log("Not found in the file! (Maybe whitespace issue?)");
}

fs.writeFileSync(path, content, 'utf8');
console.log("Done!");
