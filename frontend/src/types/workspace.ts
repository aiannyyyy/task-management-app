export type WorkspaceRole = 'owner' | 'admin' | 'member';

export interface WorkspaceMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceInvite {
  _id: string;
  email: string;
  role: WorkspaceRole;
  status: 'pending' | 'accepted' | 'expired';
  invitedBy: {
    _id: string;
    name: string;
    email: string;
  };
  expiresAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  owner: {
    _id: string;
    name: string;
    email: string;
  };
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
}