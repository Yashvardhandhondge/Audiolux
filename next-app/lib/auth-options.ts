import { NextAuthOptions, Session } from "next-auth";
import bcrypt from 'bcryptjs';
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import { emailSchema, passwordSchema } from "@/schema/credentials-schema";
import prisma from "./db";
import { PrismaClientInitializationError } from "@prisma/client/runtime/library";

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? ""
    }),
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" }
      },
      async authorize(credentials) {
        if (!credentials || !credentials.email || !credentials.password) {
          throw new Error("Missing credentials");
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
            where: { email: emailValidation.data }
          });

          if (!user) {
            const hashedPassword = await bcrypt.hash(passwordValidation.data, 10);
            return await prisma.user.create({
              data: {
                email: emailValidation.data,
                password: hashedPassword,
                provider: "Credentials"
              }
            });
          }

          if (!user.password) {
            const hashedPassword = await bcrypt.hash(passwordValidation.data, 10);
            return await prisma.user.update({
              where: { email: emailValidation.data },
              data: { password: hashedPassword }
            });
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
          console.error("Authorization error:", error);
          throw error;
        }
      }
    })
  ],
  pages: {
    signIn: "/auth"
  },
  secret: process.env.NEXTAUTH_SECRET ?? "",
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.email = profile.email as string;
        token.id = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: token.email ?? "" }
        });
        if (user) {
          session.user.id = user.id;
        }
      } catch (e) {
        if (e instanceof PrismaClientInitializationError) {
          throw new Error("Internal server error");
        }
        console.error("Session callback error:", e);
        throw e;
      }
      return session;
    },
    async signIn({ account, profile }) {
      try {
        if (account?.provider === "github" && profile?.email) {
          const user = await prisma.user.findUnique({
            where: { email: profile.email }
          });
          if (!user) {
            await prisma.user.create({
              data: {
                email: profile.email,
                name: profile.name || undefined,
                provider: 'Github'
              }
            });
          }
        }
        return true;
      } catch (e) {
        console.error("Sign-in error:", e);
        return false;
      }
    }
  }
};
