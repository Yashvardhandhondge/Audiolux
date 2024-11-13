import NextAuth from "next-auth";
import { Session, User } from "next-auth"; 

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email: string;
  }
}
