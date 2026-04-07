import { prisma } from './db.js'

async function main() {
  console.log('🚀 Performing CRUD operations on DemoUser (Neon + Prisma adapter)…')

  const email = `alice-${Date.now()}@example.com`

  const newUser = await prisma.demoUser.create({
    data: { name: 'Alice', email },
  })
  console.log('✅ CREATE:', newUser)

  const foundUser = await prisma.demoUser.findUnique({ where: { id: newUser.id } })
  console.log('✅ READ:', foundUser)

  const updatedUser = await prisma.demoUser.update({
    where: { id: newUser.id },
    data: { name: 'Alice Smith' },
  })
  console.log('✅ UPDATE:', updatedUser)

  await prisma.demoUser.delete({ where: { id: newUser.id } })
  console.log('✅ DELETE: DemoUser removed.')

  console.log('\n🎉 CRUD operations completed successfully!')
}

main()
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
