import React, { useState } from 'react';
import { Workspace } from '../types/workspace';
import { workspaceService } from '../services/api';
import { authService } from '../services/authService';

interface WorkspacePanelProps {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace | null) => void;
  onWorkspacesChange: () => void;
  onClose: () => void;
}

type PanelView = 'list' | 'create' | 'members' | 'invite';

const WorkspacePanel: React.FC<WorkspacePanelProps> = ({
  workspaces,
  activeWorkspace,
  onSelectWorkspace,
  onWorkspacesChange,
  onClose,
}) => {
  const [view, setView] = useState<PanelView>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Create form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteLink, setInviteLink] = useState('');

  const currentUser = authService.getCurrentUser();

  const clearMessages = () => { setError(''); setSuccess(''); };

  const getRole = (ws: Workspace): string => {
    const member = ws.members.find(m => m.user._id === currentUser?._id);
    return member?.role ?? 'member';
  };

  const canManage = (ws: Workspace) => ['owner', 'admin'].includes(getRole(ws));

  // ── Create workspace ────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    clearMessages();
    try {
      const ws = await workspaceService.create({ name: newName.trim(), description: newDesc.trim() || undefined });
      setSuccess(`Workspace "${ws.name}" created!`);
      setNewName('');
      setNewDesc('');
      onWorkspacesChange();
      setTimeout(() => { setView('list'); clearMessages(); }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  // ── Invite member ───────────────────────────────────────────────────────────
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !inviteEmail.trim()) return;
    setLoading(true);
    clearMessages();
    setInviteLink('');
    try {
      const result = await workspaceService.invite(activeWorkspace._id, inviteEmail.trim(), inviteRole);
      const link = `${window.location.origin}/accept-invite?token=${result.token}`;
      setInviteLink(link);
      setSuccess(`Invite sent to ${inviteEmail}!`);
      setInviteEmail('');
      onWorkspacesChange();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  // ── Remove member ───────────────────────────────────────────────────────────
  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!activeWorkspace) return;
    if (!window.confirm(`Remove ${userName} from this workspace?`)) return;
    setLoading(true);
    clearMessages();
    try {
      await workspaceService.removeMember(activeWorkspace._id, userId);
      setSuccess(`${userName} removed.`);
      onWorkspacesChange();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  // ── Change role ─────────────────────────────────────────────────────────────
  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    if (!activeWorkspace) return;
    setLoading(true);
    clearMessages();
    try {
      await workspaceService.updateMemberRole(activeWorkspace._id, userId, role);
      setSuccess('Role updated.');
      onWorkspacesChange();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  // ── Leave workspace ─────────────────────────────────────────────────────────
  const handleLeave = async () => {
    if (!activeWorkspace || !currentUser) return;
    if (!window.confirm(`Leave workspace "${activeWorkspace.name}"?`)) return;
    setLoading(true);
    try {
      await workspaceService.removeMember(activeWorkspace._id, currentUser._id);
      onSelectWorkspace(null);
      onWorkspacesChange();
      setView('list');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to leave workspace');
    } finally {
      setLoading(false);
    }
  };

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    admin: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    member: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {view !== 'list' && (
              <button onClick={() => { setView('list'); clearMessages(); setInviteLink(''); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                ← Back
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {view === 'list' && '🏢 Workspaces'}
              {view === 'create' && '✨ New Workspace'}
              {view === 'members' && `👥 ${activeWorkspace?.name}`}
              {view === 'invite' && `✉️ Invite to ${activeWorkspace?.name}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        {/* Alerts */}
        {(error || success) && (
          <div className={`mx-5 mt-4 p-3 rounded-lg text-sm ${error ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'}`}>
            {error || success}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">

          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <div className="space-y-3">
              {/* Personal tasks option */}
              <button
                onClick={() => { onSelectWorkspace(null); onClose(); }}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  !activeWorkspace
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👤</span>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Personal Tasks</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Only visible to you</p>
                  </div>
                  {!activeWorkspace && <span className="ml-auto text-blue-500 text-lg">✓</span>}
                </div>
              </button>

              {/* Workspace list */}
              {workspaces.map(ws => (
                <div
                  key={ws._id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    activeWorkspace?._id === ws._id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button className="flex items-center gap-3 flex-1 text-left" onClick={() => { onSelectWorkspace(ws); onClose(); }}>
                      <span className="text-2xl">🏢</span>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{ws.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[getRole(ws)]}`}>
                            {getRole(ws)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {ws.members.length} member{ws.members.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {ws.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ws.description}</p>}
                      </div>
                      {activeWorkspace?._id === ws._id && <span className="ml-auto text-blue-500 text-lg">✓</span>}
                    </button>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => { onSelectWorkspace(ws); setView('members'); clearMessages(); }}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Manage members"
                      >
                        👥
                      </button>
                      {canManage(ws) && (
                        <button
                          onClick={() => { onSelectWorkspace(ws); setView('invite'); clearMessages(); }}
                          className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="Invite members"
                        >
                          ✉️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {workspaces.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
                  No workspaces yet. Create one to collaborate!
                </p>
              )}

              <button
                onClick={() => { setView('create'); clearMessages(); }}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 transition-colors font-medium"
              >
                + Create New Workspace
              </button>
            </div>
          )}

          {/* ── CREATE VIEW ── */}
          {view === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="e.g. Marketing Team"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="What is this workspace for?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !newName.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create Workspace'}
              </button>
            </form>
          )}

          {/* ── MEMBERS VIEW ── */}
          {view === 'members' && activeWorkspace && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeWorkspace.members.length} member{activeWorkspace.members.length !== 1 ? 's' : ''}
                </p>
                {canManage(activeWorkspace) && (
                  <button
                    onClick={() => setView('invite')}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    + Invite Member
                  </button>
                )}
              </div>

              {activeWorkspace.members.map(member => {
                const isMe = member.user._id === currentUser?._id;
                const isOwner = activeWorkspace.owner._id === currentUser?._id;
                return (
                  <div key={member._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {member.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.user.name} {isMe && <span className="text-gray-400">(you)</span>}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Role badge / selector */}
                      {isOwner && !isMe && member.role !== 'owner' ? (
                        <select
                          value={member.role}
                          onChange={e => handleRoleChange(member.user._id, e.target.value as 'admin' | 'member')}
                          disabled={loading}
                          className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${roleColors[member.role]}`}>
                          {member.role}
                        </span>
                      )}

                      {/* Remove / leave */}
                      {!isMe && canManage(activeWorkspace) && member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.user._id, member.user.name)}
                          disabled={loading}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm px-1"
                          title="Remove member"
                        >
                          ✕
                        </button>
                      )}
                      {isMe && member.role !== 'owner' && (
                        <button
                          onClick={handleLeave}
                          disabled={loading}
                          className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 hover:underline"
                        >
                          Leave
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Pending invites */}
              {activeWorkspace.invites.filter(i => i.status === 'pending').length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                    Pending Invites
                  </p>
                  {activeWorkspace.invites.filter(i => i.status === 'pending').map(invite => (
                    <div key={invite._id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg mb-2">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{invite.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Invited as {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded-full">
                        pending
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── INVITE VIEW ── */}
          {view === 'invite' && activeWorkspace && (
            <div className="space-y-4">
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    required
                    placeholder="teammate@example.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="member">Member — can view and edit tasks</option>
                    <option value="admin">Admin — can also invite and remove members</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={loading || !inviteEmail.trim()}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                >
                  {loading ? 'Sending...' : '✉️ Send Invite'}
                </button>
              </form>

              {/* Copy link */}
              {inviteLink && (
                <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                  <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">
                    ✅ Invite link (share manually if email fails):
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={inviteLink}
                      className="flex-1 text-xs px-2 py-1.5 bg-white dark:bg-gray-700 border border-green-300 dark:border-green-600 rounded text-gray-700 dark:text-gray-300"
                    />
                    <button
                      onClick={() => { navigator.clipboard.writeText(inviteLink); setSuccess('Link copied!'); }}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                Invite expires in 7 days. The recipient must be registered or will be prompted to sign up.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkspacePanel;