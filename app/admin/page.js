'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { app } from '@/lib/firebaseClient';
import {
  deleteUserAccount,
  getAllUsers,
  toggleAdminStatus,
  updateUserProfile,
} from './actions';

const dateLabel = (value) => {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingUid, setWorkingUid] = useState('');
  const [token, setToken] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editingUser, setEditingUser] = useState(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const refreshUsers = useCallback(async (activeToken) => {
    const fetched = await getAllUsers(activeToken);
    setUsers(fetched || []);
  }, []);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      try {
        const result = await user.getIdTokenResult();
        if (!result.claims.admin) {
          alert('Access denied: administrator permissions are required.');
          await signOut(auth);
          router.push('/login');
          return;
        }
        setToken(result.token);
        await refreshUsers(result.token);
      } catch (err) {
        console.error('Admin session check failed:', err);
        setError(err?.message || 'Could not load users.');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, refreshUsers]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !term ||
        user.uid.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.displayName.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'enabled' && !user.disabled) ||
        (statusFilter === 'disabled' && user.disabled);
      const matchesRole = roleFilter === 'all' ||
        (roleFilter === 'admin' && user.isAdmin) ||
        (roleFilter === 'player' && !user.isAdmin);
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  const runAction = async (uid, action) => {
    if (!token) return;
    setError('');
    setWorkingUid(uid);
    try {
      await action();
      await refreshUsers(token);
    } catch (err) {
      setError(err?.message || 'Action failed.');
    } finally {
      setWorkingUid('');
    }
  };

  const handleLogout = async () => {
    await signOut(getAuth(app));
    router.push('/login');
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!editingUser) return;
    const form = new FormData(event.currentTarget);
    const changes = {
      displayName: String(form.get('displayName') || ''),
      email: String(form.get('email') || ''),
    };
    await runAction(editingUser.uid, async () => {
      await updateUserProfile(token, editingUser.uid, changes);
      setEditingUser(null);
    });
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600 dark:bg-gray-950 dark:text-gray-300">
        <p className="font-semibold">Verifying administrator session…</p>
      </main>
    );
  }

  const admins = users.filter((user) => user.isAdmin).length;
  const disabled = users.filter((user) => user.disabled).length;

  return (
    <main className="min-h-screen bg-gray-50 p-4 pt-20 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 sm:p-8 sm:pt-20">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">Tic-Tac-Toe · Control center</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">User management</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Manage player profiles, account status, and administrator access.</p>
          </div>
          <button onClick={handleLogout} className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40">
            Sign out
          </button>
        </header>

        {error && (
          <div role="alert" className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
            <span>{error}</span>
            <button onClick={() => setError('')} aria-label="Dismiss error" className="font-bold">✕</button>
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Total users', users.length, 'All accounts returned by Firebase'],
            ['Administrators', admins, 'Accounts with admin privileges'],
            ['Active accounts', users.length - disabled, 'Accounts currently enabled'],
            ['Disabled accounts', disabled, 'Accounts blocked from signing in'],
          ].map(([label, value, hint]) => (
            <article key={label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
              <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{hint}</p>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 dark:border-gray-800 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">All users</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Showing {filteredUsers.length} of {users.length} users</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:flex">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, UID…" aria-label="Search users" className="min-w-0 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-950" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter account status" className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950">
                <option value="all">All statuses</option><option value="enabled">Enabled</option><option value="disabled">Disabled</option>
              </select>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter role" className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950">
                <option value="all">All roles</option><option value="admin">Admins</option><option value="player">Players</option>
              </select>
              <button onClick={() => token && runAction('refresh', () => refreshUsers(token))} disabled={Boolean(workingUid)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800">Refresh</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/70 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Email status</th>
                  <th className="px-4 py-3 font-semibold">Registered</th>
                  <th className="px-4 py-3 font-semibold">Last sign-in</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Account</th>
                  <th className="px-4 py-3 font-semibold">Provider</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="align-top transition hover:bg-gray-50/80 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {user.photoURL ? <img src={user.photoURL} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{(user.displayName || user.email || '?').slice(0, 1).toUpperCase()}</div>}
                        <div className="max-w-[250px]">
                          <p className="font-semibold">{user.displayName || 'Anonymous Player'}</p>
                          <p className="mt-1 break-all font-mono text-[11px] text-gray-400" title={user.uid}>{user.uid}</p>
                          <p className="mt-1 break-all text-xs text-gray-500 dark:text-gray-400">{user.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.emailVerified ? 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'}`}>{user.emailVerified ? 'Verified' : 'Unverified'}</span></td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-600 dark:text-gray-300">{dateLabel(user.creationTime)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-gray-600 dark:text-gray-300">{dateLabel(user.lastSignInTime)}</td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isAdmin ? 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>{user.isAdmin ? 'Administrator' : 'Player'}</span></td>
                    <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.disabled ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300' : 'bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300'}`}>{user.disabled ? 'Disabled' : 'Enabled'}</span></td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-300">{user.providers.length ? user.providers.join(', ') : '—'}</td>
                    <td className="px-4 py-4">
                      <div className="flex min-w-[145px] flex-col items-stretch gap-2">
                        <button disabled={Boolean(workingUid)} onClick={() => setEditingUser(user)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800">Edit profile</button>
                        <button disabled={Boolean(workingUid)} onClick={() => runAction(user.uid, () => updateUserProfile(token, user.uid, { disabled: !user.disabled }))} className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50 dark:border-amber-900 dark:text-amber-300 dark:hover:bg-amber-950/40">{user.disabled ? 'Enable account' : 'Disable account'}</button>
                        <button disabled={Boolean(workingUid)} onClick={() => {
                          if (confirm(`${user.isAdmin ? 'Change administrator access for' : 'Change role for'} ${user.email || user.uid}?`)) {
                            runAction(user.uid, () => toggleAdminStatus(token, user.uid, !user.isAdmin));
                          }
                        }} className="rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-900 dark:text-violet-300 dark:hover:bg-violet-950/40">{user.isAdmin ? 'Revoke admin' : 'Grant admin'}</button>
                        <button disabled={Boolean(workingUid)} onClick={() => {
                          if (confirm(`Permanently delete ${user.email || user.uid}? This cannot be undone.`)) {
                            runAction(user.uid, () => deleteUserAccount(token, user.uid));
                          }
                        }} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40">Delete user</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">No users match these filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <p className="text-xs text-gray-400 dark:text-gray-500">Security: all write actions are checked on the server. Firebase Auth user deletion does not automatically delete related Firestore or Realtime Database data.</p>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditingUser(null); }}>
          <form onSubmit={saveProfile} className="w-full max-w-lg space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-start justify-between gap-4">
              <div><h2 className="text-xl font-bold">Edit user profile</h2><p className="mt-1 break-all text-xs text-gray-500">{editingUser.uid}</p></div>
              <button type="button" onClick={() => setEditingUser(null)} aria-label="Close dialog" className="rounded-lg px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
            </div>
            <label className="block space-y-1.5"><span className="text-sm font-semibold">Display name</span><input name="displayName" defaultValue={editingUser.displayName} maxLength={100} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950" /></label>
            <label className="block space-y-1.5"><span className="text-sm font-semibold">Email address</span><input name="email" type="email" required defaultValue={editingUser.email} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950" /></label>
            <p className="text-xs text-amber-700 dark:text-amber-300">Changing an email address here updates Firebase Authentication. It does not automatically change any separate user profile document in Firestore.</p>
            <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingUser(null)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-700">Cancel</button><button disabled={Boolean(workingUid)} type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{workingUid === editingUser.uid ? 'Saving…' : 'Save changes'}</button></div>
          </form>
        </div>
      )}
    </main>
  );
}
