import { NextAuthOptions, Session as NextAuthSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { JWT } from 'next-auth/jwt'; // Correct import for JWT
import Credentials from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
import { emailSchema, passwordSchema } from '@/schema/credentials-schema';
import { PrismaClientInitializationError } from '@prisma/client/runtime/library';
import prisma from './db';

// Define your custom Session interface
interface Session extends NextAuthSession {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    }),
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" }
      },
      async authorize(credentials) {
        if (!credentials || !credentials.email || !credentials.password) {
          return null;
        }

        const emailValidation = emailSchema.safeParse(credentials.email);
        if (!emailValidation.success) {
          throw new Error("Invalid email");
        }

        const passwordValidation = passwordSchema.safeParse(credentials.password);
        if (!passwordValidation.success) {
          throw new Error(passwordValidation.error.issues[0].message);
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: emailValidation.data
            }
          });

          if (!user) {
            const hashedPassword = await bcrypt.hash(passwordValidation.data, 10);
            const newUser = await prisma.user.create({
              data: {
                email: emailValidation.data,
                password: hashedPassword,
                provider: "Credentials"
              }
            });
            return newUser;
          }

          if (!user.password) {
            const hashedPassword = await bcrypt.hash(passwordValidation.data, 10);
            const authUser = await prisma.user.update({
              where: {
                email: emailValidation.data
              },
              data: {
                password: hashedPassword
              }
            });
            return authUser;
          }

          const passwordVerification = await bcrypt.compare(passwordValidation.data, user.password);

          if (!passwordVerification) {
            throw new Error("Invalid password");
          }

          return user;
        } catch (error) {
          if (error instanceof PrismaClientInitializationError) {
            throw new Error("Internal server error");
          }
          console.log(error);
          throw error;
        }
      }
    })
  ],
  pages: {
    signIn: '/auth'
  },
  secret: process.env.NEXTAUTH_SECRET ?? "secret",
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.email = profile.email as string;
        token.id = account.access_token;  // GitHub access token or credentials
      }
      return token;
    },
    async session({ session, token }: { session: Session, token: JWT}) {
      try {
        if (!session.user) {
          session.user = {} as Session['user'];  // Initialize user if it's undefined
        }

        const dbUser = await prisma.user.findUnique({
          where: {
            email: token.email ?? undefined
          }
        });

        if (dbUser && session.user) {
          session.user.id = dbUser.id;  // Add user ID to session
        }
      } catch (error) {
        if (error instanceof PrismaClientInitializationError) {
          throw new Error("Internal server error");
        }
        console.log(error);
        throw error;
      }
      return session;
    },
    async signIn({ account, profile }) {
      try {
        if (account?.provider === "github") {
          const user = await prisma.user.findUnique({
            where: {
              email: profile?.email!,
            }
          });

          if (!user) {
            // Create a new user from GitHub profile data
            const newUser = await prisma.user.create({
              data: {
                email: profile?.email!,
                name: profile?.name  || undefined,  // Fallback to GitHub login name
                provider: "Github"  // Make sure this matches Prisma model (case-sensitive)
              }
            });
          }
        }
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    }
  }
};
