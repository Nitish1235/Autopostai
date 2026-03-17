
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { id: 'user_3AplRyZJlSHTMCJsUUtaMG5tJXs' }
  });
  const video = await prisma.video.findUnique({
    where: { id: 'cmmt1vr6g000110m8spjtK4k2' }
  });
  console.log('User:', user);
  console.log('Video:', video);

  // Check their platforms count
  if (user) {
    const platforms = await prisma.platformConnection.findMany({
      where: { userId: user.id }
    });
    console.log('Platforms:', platforms);
  }
}

main().finally(() => prisma.$disconnect());
