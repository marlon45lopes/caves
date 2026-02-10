-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nome, tipo)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'tipo', 'atendente')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nome = COALESCE(EXCLUDED.nome, public.usuarios.nome),
    -- Only update type if it's explicitly provided in metadata, otherwise keep existing
    tipo = COALESCE(new.raw_user_meta_data->>'tipo', public.usuarios.tipo);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
