import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt", // No DB needed — session stored in encrypted cookie
  },
  callbacks: {
    async jwt({ token, account }) {
      // First login: persist provider info into the JWT
      if (account) {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      // Expose token data to client via useSession()
      if (session.user) {
        session.user.id = token.sub;
        session.user.provider = token.provider;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login", // Custom login page instead of default NextAuth one
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
