const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst();
    const connections = await prisma.platformConnection.findMany({ where: { userId: user.id }});
    const video = await prisma.video.findFirst();
    console.log("User ID:", user.id);
    console.log("Video UserID:", video?.userId);
    console.log("Connection UserID:", connections[0]?.userId);
}

main().finally(() => prisma.$disconnect());
