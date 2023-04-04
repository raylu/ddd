#!/usr/bin/env bash

set -eu

ssh lilim.programming.im psql -h elephant.local -U statbot_ro -d statbot --quiet --echo-errors < dump_csvs.sql
scp -qr lilim.programming.im:raw .
rm -f raw/messages.csv.lzma
lzma raw/messages.csv

~/venv/bin/python3 ../discord_log/discord_log -q

~/venv/bin/python3 ./prepare_db.py -q
#./markov.py gen
