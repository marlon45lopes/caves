
-- Enable the unaccent extension to ignore accents in search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Function to search patients by name (ignoring accents and case) or CPF
CREATE OR REPLACE FUNCTION search_pacientes(search_text TEXT)
RETURNS SETOF pacientes AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM pacientes
    WHERE 
        -- Search by Name (ignoring accents and case)
        unaccent(nome) ILIKE unaccent('%' || search_text || '%')
        OR
        -- Search by CPF (removing formatting dots and dashes from search_text if needed)
        REPLACE(REPLACE(cpf, '.', ''), '-', '') ILIKE '%' || REPLACE(REPLACE(search_text, '.', ''), '-', '') || '%'
    ORDER BY nome ASC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
