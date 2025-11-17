'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mail, Copy, Trash2, RefreshCw, UserPlus, Shield, UserIcon } from 'lucide-react';

interface User {
  email: string;
  username: string;
  password: string;
  role: 'admin' | 'member';
  status: 'active' | 'invited';
  createdAt: string;
}

interface Invitation {
  email: string;
  token: string;
  sentAt: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    const currentUserEmail = localStorage.getItem('currentUser');
    if (!currentUserEmail) {
      router.push('/');
      return;
    }

    const storedUsers = JSON.parse(localStorage.getItem('appUsers') || '[]');
    const user = storedUsers.find((u: User) => u.email === currentUserEmail);
    
    if (!user || user.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setCurrentUser(user);
    setUsers(storedUsers);
    setInvitations(JSON.parse(localStorage.getItem('invitations') || '[]'));
    setLoading(false);
  }, [router]);

  const generateToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const handleSendInvite = () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    if (users.find(u => u.email === inviteEmail)) {
      alert('This email is already registered');
      return;
    }

    if (invitations.find(i => i.email === inviteEmail && i.status === 'pending')) {
      alert('An invitation has already been sent to this email');
      return;
    }

    const token = generateToken();
    const newInvitation: Invitation = {
      email: inviteEmail,
      token,
      sentAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      status: 'pending'
    };

    const updatedInvitations = [...invitations, newInvitation];
    setInvitations(updatedInvitations);
    localStorage.setItem('invitations', JSON.stringify(updatedInvitations));
    
    setInviteEmail('');
    alert('Invitation sent! Copy the invite link and send it to the user.');
  };

  const handleCancelInvitation = (token: string) => {
    const updatedInvitations = invitations.filter(i => i.token !== token);
    setInvitations(updatedInvitations);
    localStorage.setItem('invitations', JSON.stringify(updatedInvitations));
  };

  const handleResendInvitation = (email: string) => {
    const invitation = invitations.find(i => i.email === email);
    if (!invitation) return;

    const token = generateToken();
    const updatedInvitations = invitations.map(i =>
      i.email === email
        ? { ...i, token, sentAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
        : i
    );
    setInvitations(updatedInvitations);
    localStorage.setItem('invitations', JSON.stringify(updatedInvitations));
    
    alert('New invitation link generated!');
  };

  const handleChangeRole = (email: string, newRole: 'admin' | 'member') => {
    const adminCount = users.filter(u => u.role === 'admin').length;
    
    if (newRole === 'member' && adminCount === 1 && users.find(u => u.email === email)?.role === 'admin') {
      alert('Cannot demote the last admin');
      return;
    }

    const updatedUsers = users.map(u =>
      u.email === email ? { ...u, role: newRole } : u
    );
    setUsers(updatedUsers);
    localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
  };

  const handleDeactivateUser = (email: string) => {
    if (email === currentUser?.email) {
      alert('Cannot deactivate your own account');
      return;
    }

    const updatedUsers = users.map(u =>
      u.email === email ? { ...u, status: 'invited' as const } : u
    );
    setUsers(updatedUsers);
    localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
  };

  const copyInviteLink = (token: string) => {
    const inviteLink = `${window.location.origin}/invite/accept?token=${token}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Admin Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage users, invitations, and workspace settings</p>
        </div>


        <div className="grid md:grid-cols-2 gap-6">
          {/* Invitations Section */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Send Invitation
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                  <Button
                    onClick={handleSendInvite}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Pending Invitations ({invitations.filter(i => i.status === 'pending').length})</h3>
                {invitations.filter(i => i.status === 'pending').map((invitation) => (
                  <div key={invitation.token} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white">{invitation.email}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Sent {new Date(invitation.sentAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyInviteLink(invitation.token)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition"
                        title="Copy invite link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResendInvitation(invitation.email)}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition"
                        title="Resend invitation"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCancelInvitation(invitation.token)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition"
                        title="Cancel invitation"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                    {copiedToken === invitation.token && (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-2">Copied!</span>
                    )}
                  </div>
                ))}
                {invitations.filter(i => i.status === 'pending').length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No pending invitations</p>
                )}
              </div>
            </div>
          </div>

          {/* Users Section */}
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Active Users ({users.filter(u => u.status === 'active').length})</h2>
            
            <div className="space-y-2">
              {users.filter(u => u.status === 'active').map((user) => (
                <div key={user.email} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        {user.email}
                        {user.role === 'admin' && <Shield className="w-4 h-4 text-blue-600" />}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</div>
                    </div>
                    {user.email !== currentUser?.email && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleChangeRole(user.email, user.role === 'admin' ? 'member' : 'admin')}
                          size="sm"
                          variant="outline"
                        >
                          {user.role === 'admin' ? 'Make Member' : 'Make Admin'}
                        </Button>
                        <Button
                          onClick={() => handleDeactivateUser(user.email)}
                          size="sm"
                          variant="outline"
                          className="text-red-600"
                        >
                          Deactivate
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <Button
            onClick={() => router.push('/dashboard')}
            variant="outline"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
