// auth.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          credentials?.username === "test-user" &&
          credentials?.password === "mis@systems"
        ) {
          return {
            id: "test",
            name: "User",
            email: "user@shaziarice.com",
            image:
              "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQiMobM3dnjg-13GqCOo9EtioNfZ-FXLiU-Ag&s",
          };
        }
        return null;
      },
    }),
  ],

  callbacks: {
    async signIn({ account, profile }: any) {
      if (account?.provider === "google") {
        const email = profile?.email;
        const verified = profile?.email_verified;
        if (!verified || !email) return false;

        return (
          email.endsWith("@shaziarice.com") ||
          email === "sk2061899@gmail.com"
        );
      }
      return true;
    },
  },

  pages: {
    signIn: "/login",
  },
});
