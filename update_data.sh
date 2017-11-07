#!/usr/bin/env bash

set -eu

psql -h lilith.undo.it -U statbot_ro -d statbot -f dump_csvs.sql --quiet --echo-errors
rm -f raw/messages.csv.lzma
lzma raw/messages.csv

./prepare_db.py -q
./markov.py gen
