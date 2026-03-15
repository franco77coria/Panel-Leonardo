import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

const USERS = [
    { id: '1', username: 'f77franco', password: '42725129', name: 'Franco' },
    { id: '2', username: 'Leo.Vir', password: '1985ELV', name: 'Leonardo' },
]

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Credentials({
            credentials: {
                username: { label: 'Usuario' },
                password: { label: 'Contraseña', type: 'password' },
            },
            async authorize(credentials) {
                const user = USERS.find(
                    u => u.username === credentials?.username && u.password === credentials?.password
                )
                if (!user) return null
                return { id: user.id, name: user.name, email: `${user.username}@panel` }
            },
        }),
    ],
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
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
