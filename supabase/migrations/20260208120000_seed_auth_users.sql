-- Create the extension if it doesn't exist to allow password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Insert users into auth.users
-- Password for all users is: Mudar@123
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    role,
    aud,
    confirmation_token
)
VALUES
  ('12375134-9e04-4195-a8d7-27582e28c161', 'evelin@gmail.com', crypt('Mudar@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nome": "Evelin", "tipo": "admin"}', now(), now(), 'authenticated', 'authenticated', ''),
  ('30314f2b-dfc3-4aa2-b2d5-2cf6fe93ae91', 'juliana@gmail.com', crypt('Mudar@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nome": "Juliana", "tipo": "clinica"}', now(), now(), 'authenticated', 'authenticated', ''),
  ('3ef14f22-ab31-419a-8cab-cbf9173f0a9a', 'kelvin@gmail.com', crypt('Mudar@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nome": "Kelvin", "tipo": "clinica"}', now(), now(), 'authenticated', 'authenticated', ''),
  ('74f6e595-c4da-4e96-b2a0-905f3f027803', 'neto@gmail.com', crypt('Mudar@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nome": "Neto", "tipo": "atendente"}', now(), now(), 'authenticated', 'authenticated', ''),
  ('900e48de-205d-4c1a-a251-db091500ef57', 'neuma@gmail.com', crypt('Mudar@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nome": "Neuma", "tipo": "atendente"}', now(), now(), 'authenticated', 'authenticated', ''),
  ('c21c5d3e-2f53-4b11-9761-cd6990bc7c23', 'careca@gmail.com', crypt('Mudar@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nome": "Careca", "tipo": "clinica"}', now(), now(), 'authenticated', 'authenticated', ''),
  ('c3ecc364-3aaf-48f3-b434-4195c412d299', 'shirley@gmail.com', crypt('Mudar@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nome": "Shirley", "tipo": "clinica"}', now(), now(), 'authenticated', 'authenticated', ''),
  ('d204fdc7-6668-4793-b561-ccfc909814c3', 'marlon@gmail.com', crypt('Mudar@123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"nome": "Marlon", "tipo": "admin"}', now(), now(), 'authenticated', 'authenticated', '')
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = now();
