import { useState } from 'react';
import { Mail, Send, UserCog } from 'lucide-react';
import type { BoardRole, Invitation, Member } from '../types';

export function MembersView({
  members,
  invitations,
  canManage,
  onInvite,
  onAccept,
  onReject,
  onRoleChange,
}: {
  members: Member[];
  invitations: Invitation[];
  canManage: boolean;
  onInvite: (email: string, role: BoardRole) => Promise<void>;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onRoleChange: (userId: string, role: BoardRole) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<BoardRole>('member');

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Members & invitations</h2>
        <p className="text-gray-600">Roles and invites are enforced on the server.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <UserCog className="h-5 w-5 text-blue-600" />
          Members
        </h3>
        <ul className="divide-y divide-gray-100">
          {members.map((m) => (
            <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium text-gray-900">{m.name}</p>
                <p className="text-sm text-gray-500">{m.email}</p>
              </div>
              {canManage ? (
                <select
                  className="input-control !w-auto min-w-[140px]"
                  value={m.role}
                  onChange={(e) => onRoleChange(m.user_id, e.target.value as BoardRole)}
                >
                  <option value="admin">admin</option>
                  <option value="member">member</option>
                  <option value="viewer">viewer</option>
                  <option value="owner" disabled>
                    owner
                  </option>
                </select>
              ) : (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase text-gray-700">{m.role}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {canManage && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Send className="h-5 w-5 text-blue-600" />
            Send invitation
          </h3>
          <div className="flex flex-wrap gap-2">
            <input className="input-control max-w-md flex-1" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select value={role} className="input-control !w-auto" onChange={(e) => setRole(e.target.value as BoardRole)}>
              <option value="viewer">viewer</option>
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
            <button type="button" className="btn-primary" onClick={() => onInvite(email, role).then(() => setEmail(''))}>
              Send
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Mail className="h-5 w-5 text-amber-600" />
          My pending invitations
        </h3>
        {invitations.length ? (
          <ul className="space-y-3">
            {invitations.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3">
                <span className="font-medium text-gray-900">
                  {i.board_name} · {i.role}
                </span>
                <div className="flex gap-2">
                  <button type="button" className="btn-primary !py-1.5 !text-xs" onClick={() => onAccept(i.id)}>
                    Accept
                  </button>
                  <button type="button" className="btn-secondary !py-1.5 !text-xs" onClick={() => onReject(i.id)}>
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No pending invitations.</p>
        )}
      </div>
    </section>
  );
}
