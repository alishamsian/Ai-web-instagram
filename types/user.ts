export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface Workspace {
  id: string;
  ownerId: string;
  name: string;
  plan: "free" | "pro" | "business";
  createdAt: string;
}

export interface Session {
  user: User;
  workspace: Workspace;
}
