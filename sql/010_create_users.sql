-- ============================================================
-- 010_create_users.sql
-- App accounts. Passwords are stored as a one-way hash (never plaintext).
-- Run after 000_init.sql. Do not execute automatically from the app.
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name          VARCHAR(80)  NOT NULL,
    last_name           VARCHAR(120) NOT NULL,
    email               VARCHAR(254) NOT NULL,
    username            VARCHAR(40)  NOT NULL,
    phone_country_code  VARCHAR(8),
    phone               VARCHAR(20),
    password_hash       TEXT         NOT NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT users_first_name_not_blank CHECK (length(btrim(first_name)) > 0),
    CONSTRAINT users_last_name_not_blank  CHECK (length(btrim(last_name)) > 0),
    CONSTRAINT users_email_not_blank      CHECK (length(btrim(email)) > 0),
    CONSTRAINT users_username_not_blank   CHECK (length(btrim(username)) > 0),
    CONSTRAINT users_password_not_blank   CHECK (length(btrim(password_hash)) > 0)
);

COMMENT ON TABLE  users                    IS 'Cuentas de la aplicación (nombre, apellidos, correo, teléfono, usuario).';
COMMENT ON COLUMN users.first_name         IS 'Nombre.';
COMMENT ON COLUMN users.last_name          IS 'Apellidos.';
COMMENT ON COLUMN users.email              IS 'Correo electrónico (único, se guarda en minúsculas).';
COMMENT ON COLUMN users.username           IS 'Nombre de usuario (único, 8-40 caracteres, solo minúsculas, números o _).';
COMMENT ON COLUMN users.phone_country_code IS 'Indicativo telefónico (p. ej. +57).';
COMMENT ON COLUMN users.phone              IS 'Número de teléfono sin el indicativo.';
COMMENT ON COLUMN users.password_hash      IS 'Hash irreversible (HMAC con PASSWORD_PEPPER + scrypt). Nunca texto plano.';

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_uq
    ON users (lower(btrim(email)));

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uq
    ON users (lower(btrim(username)));

CREATE OR REPLACE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
