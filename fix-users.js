const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fixing existing User primary keys to match Clerk IDs...');
  
  const users = await prisma.user.findMany({
    where: {
      clerkId: { not: null },
      NOT: {
        id: { equals: prisma.user.fields.clerkId } // only where id != clerkId (technically prisma syntax is limited here, so we process arrays)
      }
    }
  });

  let count = 0;
  for (const user of users) {
    if (user.id !== user.clerkId) {
      console.log(`Fixing user: ${user.email} from ${user.id} -> ${user.clerkId}`);
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET id = $1 WHERE id = $2`,
          user.clerkId,
          user.id
        );
        count++;
      } catch (err) {
        console.error('Migration error for ' + user.email, err);
      }
    }
  }
  
  console.log(`Successfully migrated ${count} users.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
