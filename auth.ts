import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import * as bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                username: { label: 'Usuario' },
                password: { label: 'Contraseña', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) return null

                const user = await prisma.user.findUnique({
                    where: { username: credentials.username as string },
                })

                if (!user || !user.activo) return null

                const passwordOk = await bcrypt.compare(
                    credentials.password as string,
                    user.passwordHash
                )
                if (!passwordOk) return null

                return { id: user.id, name: user.name, email: `${user.username}@panel` }
            },
        }),
    ],
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 días
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isOnLogin = nextUrl.pathname === '/login'
            if (isOnLogin) {
                if (isLoggedIn) return Response.redirect(new URL('/', nextUrl))
                return true
            }
            return isLoggedIn
        },
    },
})
