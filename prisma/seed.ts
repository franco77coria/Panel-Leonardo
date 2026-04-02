import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const users = [
    { username: 'f77franco', password: '42725129', name: 'Franco' },
    { username: 'Leo.Vir',   password: '1985ELV',  name: 'Leonardo' },
]

async function main() {
    for (const u of users) {
        const passwordHash = await bcrypt.hash(u.password, 10)
        await prisma.user.upsert({
            where:  { username: u.username },
            update: {},
            create: { username: u.username, passwordHash, name: u.name },
        })
        console.log(`Usuario creado/actualizado: ${u.username}`)
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
