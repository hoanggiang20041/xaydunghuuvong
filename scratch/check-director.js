const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const directorRole = await prisma.role.findUnique({
    where: { name: 'DIRECTOR' },
    include: { rolePermissions: { include: { permission: true } } }
  })
  
  if (directorRole) {
    console.log("DIRECTOR role found!")
    console.log("Permissions:", directorRole.rolePermissions.map(rp => rp.permission.code))
  } else {
    console.log("DIRECTOR role NOT found in database!")
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
