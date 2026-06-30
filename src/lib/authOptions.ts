import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import type { NextAuthOptions } from "next-auth"

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET || "quotesys-secret-key-2024",
  pages: { signIn: "/" },
  providers: [
    CredentialsProvider({
      name: "Acceso Corporativo",
      credentials: {
        username: { label: "Nombre de Usuario", type: "text", placeholder: "admin" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { username: credentials.username } });
        if (user && user.password === credentials.password) {
          return { id: user.id, name: user.name, username: user.username, role: user.role, image: user.image } as any;
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.username = (user as any).username;
        token.image = user.image;
      }
      if (trigger === "update" && session?.role) {
        token.role = session.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).username = token.username;
        session.user.image = token.image as string | null | undefined;
      }
      return session;
    },
  },
}
