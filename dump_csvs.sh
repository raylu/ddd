psql -h lilith.undo.it -U statbot_ro -d statbot -f dump_csvs.sql
rm -f raw/messages.csv.lzma
lzma raw/messages.csv
