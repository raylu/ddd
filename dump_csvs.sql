\COPY (SELECT channel_id, name FROM channels WHERE guild_id = 181866934353133570) TO 'raw/channels.csv' DELIMITER ',' CSV HEADER;

\COPY (SELECT int_user_id, real_user_id, name FROM users) TO 'raw/users.csv' DELIMITER ',' CSV HEADER;

\COPY (SELECT channel_id, int_user_id, date_trunc('hour', created_at) AS hour, COUNT(*) FROM messages WHERE deleted_at IS NULL AND guild_id = 181866934353133570 GROUP BY channel_id, int_user_id, hour) TO 'raw/messages.csv' DELIMITER ',' CSV HEADER;
