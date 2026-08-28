#!/usr/bin/env sh
# =============================================================================
# One-time database bootstrap for Volleyhub on the server that already runs
# kindergarten.
# =============================================================================
# Creates a dedicated `volleyhub` role and a SEPARATE `volleyhub-db` database
# inside the existing Postgres. The two products must never share one database:
# both create `public.tenant` / `public.account` and both name their per-tenant
# schemas `tenant_<id>`, so they would overwrite each other.
#
# The admin password is never copied anywhere - the script runs psql inside the
# Postgres pod, which is already authenticated as the local superuser.
#
# Usage (on the k3s node):
#   VOLLEYHUB_DB_PASSWORD='the-same-password-you-put-in-volleyhub-secrets' \
#     sh deploy/bootstrap-db.sh
#
# Safe to re-run: the role is created only when missing (its password is then
# reset either way), and the database only when missing. Never touches
# kindergarten-db.
# =============================================================================
set -eu

PASSWORD="${VOLLEYHUB_DB_PASSWORD:?set VOLLEYHUB_DB_PASSWORD to the password stored in the volleyhub-secrets Secret}"
KUBECTL="${KUBECTL:-k3s kubectl}"
PG_NAMESPACE="${PG_NAMESPACE:-kindergarten}"
PG_SELECTOR="${PG_SELECTOR:-app=kindergarten-postgres}"
PG_SUPERUSER="${PG_SUPERUSER:-admin}"

POD=$($KUBECTL -n "$PG_NAMESPACE" get pod -l "$PG_SELECTOR" -o jsonpath='{.items[0].metadata.name}')
if [ -z "$POD" ]; then
    echo "Postgres pod not found in namespace $PG_NAMESPACE (selector $PG_SELECTOR)" >&2
    exit 1
fi
echo "Using Postgres pod: $POD"

# The password travels as a psql variable and is rendered with format(%L), so a
# password containing quotes cannot break out of the statement. \gexec is what
# makes this idempotent: the SELECT produces the DDL only when it is needed, and
# nothing at all when the object already exists.
$KUBECTL -n "$PG_NAMESPACE" exec -i "$POD" -- \
    psql -v ON_ERROR_STOP=1 -U "$PG_SUPERUSER" -d postgres -v vhpass="$PASSWORD" <<'SQL'
SELECT format('CREATE ROLE volleyhub LOGIN PASSWORD %L', :'vhpass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'volleyhub')\gexec

SELECT format('ALTER ROLE volleyhub LOGIN PASSWORD %L', :'vhpass')\gexec

SELECT 'CREATE DATABASE "volleyhub-db" OWNER volleyhub'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'volleyhub-db')\gexec

-- The owner already has full rights; this only states the intent and is a no-op on re-runs.
GRANT ALL PRIVILEGES ON DATABASE "volleyhub-db" TO volleyhub;

\echo '--- databases on this server ---'
SELECT datname, pg_get_userbyid(datdba) AS owner FROM pg_database WHERE datistemplate = false ORDER BY datname;
SQL

echo
echo "Done. volleyhub-db is ready; the API creates its own schemas on first start."
