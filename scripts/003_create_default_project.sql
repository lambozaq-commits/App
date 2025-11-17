-- Function to create default Inbox project for new users
CREATE OR REPLACE FUNCTION public.create_default_project()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.projects (user_id, name, color)
  VALUES (NEW.id, 'Inbox', '#3b82f6')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create default project on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_project ON auth.users;

CREATE TRIGGER on_auth_user_created_project
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_project();
