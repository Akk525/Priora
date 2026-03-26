export type User = { id: string; email: string; name: string };
export type BoardRole = 'owner' | 'admin' | 'member' | 'viewer';

export type Board = {
  id: string;
  name: string;
  description?: string;
  color: string;
  role?: BoardRole;
};

export type Column = { id: string; board_id: string; title: string; position: number };
export type Category = { id: string; board_id: string; name: string; color: string };

export type Card = {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description?: string;
  assignee_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category_id?: string;
  start_date?: string;
  due_date?: string;
  completed_at?: string | null;
  archived: boolean;
  archived_at?: string | null;
  position: number;
  assignee_name?: string;
  category_name?: string;
  column_title?: string;
};

export type Member = {
  board_id: string;
  user_id: string;
  role: BoardRole;
  joined_at: string;
  email: string;
  name: string;
};

export type Invitation = {
  id: string;
  board_id: string;
  board_name: string;
  email: string;
  role: BoardRole;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
};

export type ReportSummary = {
  total: number;
  overdue: number;
  byPriority: Record<string, number>;
  byColumn: Record<string, number>;
};

export type ReportResponse = {
  cards: Card[];
  summary: ReportSummary;
  options: {
    boards: Array<{ id: string; name: string }>;
    columns: Array<{ id: string; title: string }>;
    categories: Array<{ id: string; name: string }>;
    assignees: Array<{ id: string; name: string }>;
  };
};
