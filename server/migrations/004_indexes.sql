CREATE INDEX IF NOT EXISTS idx_users_email ON users(lower(email));
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_board_members_user_lookup ON board_members(user_id, board_id);
CREATE INDEX IF NOT EXISTS idx_cards_board_archived ON cards(board_id, archived);
CREATE INDEX IF NOT EXISTS idx_cards_column_position ON cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_invites_email_status ON board_invitations(lower(email), status);
CREATE INDEX IF NOT EXISTS idx_cards_assignee ON cards(assignee_id);
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);
