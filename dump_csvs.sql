\COPY (SELECT channel_id, name FROM channels WHERE guild_id = 181866934353133570) TO 'raw/channels.csv' DELIMITER ',' CSV HEADER;
\COPY (SELECT real_user_id, int_user_id, name FROM users) TO 'raw/users.csv' DELIMITER ',' CSV HEADER;
\COPY (SELECT message_id, channel_id, int_user_id, content FROM messages WHERE guild_id = 181866934353133570) TO 'raw/messages.csv' DELIMITER ',' CSV HEADER;
