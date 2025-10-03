#!/usr/bin/env bash

set -eu

ssh lilim.programming.im psql -h elephant.local -U statbot_ro -d statbot --quiet --echo-errors < dump_csvs.sql
scp -qr lilim.programming.im:raw .
rm -f raw/messages.csv.lzma
lzma raw/messages.csv

~raylu/bin/uv --directory ../discord_log run --quiet ./discord_log -q

~raylu/bin/uv run --quiet ./prepare_db.py -q
sudo systemctl restart ddd
