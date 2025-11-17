-- Enable Row Level Security on all tables

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- Boards policies
CREATE POLICY "boards_select_own" ON public.boards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "boards_insert_own" ON public.boards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "boards_update_own" ON public.boards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "boards_delete_own" ON public.boards FOR DELETE USING (auth.uid() = user_id);

-- Cards policies
CREATE POLICY "cards_select_own" ON public.cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cards_insert_own" ON public.cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cards_update_own" ON public.cards FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "cards_delete_own" ON public.cards FOR DELETE USING (auth.uid() = user_id);

-- Focus sessions policies
CREATE POLICY "focus_sessions_select_own" ON public.focus_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "focus_sessions_insert_own" ON public.focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "focus_sessions_update_own" ON public.focus_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "focus_sessions_delete_own" ON public.focus_sessions FOR DELETE USING (auth.uid() = user_id);

-- Journal entries policies
CREATE POLICY "journal_entries_select_own" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "journal_entries_insert_own" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_entries_update_own" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "journal_entries_delete_own" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);

-- Budget tables policies
CREATE POLICY "budget_tables_select_own" ON public.budget_tables FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budget_tables_insert_own" ON public.budget_tables FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budget_tables_update_own" ON public.budget_tables FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budget_tables_delete_own" ON public.budget_tables FOR DELETE USING (auth.uid() = user_id);

-- Budget categories policies
CREATE POLICY "budget_categories_select_own" ON public.budget_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budget_categories_insert_own" ON public.budget_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budget_categories_update_own" ON public.budget_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budget_categories_delete_own" ON public.budget_categories FOR DELETE USING (auth.uid() = user_id);

-- Projects policies
CREATE POLICY "projects_select_own" ON public.projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert_own" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update_own" ON public.projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "projects_delete_own" ON public.projects FOR DELETE USING (auth.uid() = user_id);
