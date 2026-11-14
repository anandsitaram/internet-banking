#!/bin/sh
# Runs once, when the fineract-db volume is first initialised.
# POSTGRES_DB (fineract_tenants) already exists; Fineract also needs the default tenant DB.
# The database is created by POSTGRES_USER, so no hard-coded owner is needed.
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -c "CREATE DATABASE fineract_default;"
