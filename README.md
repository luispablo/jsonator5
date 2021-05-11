# jsonator5
Easily turn SQL databases content into JSON files

```bash
FILENAME=test/fixtures.json DBHOST=localhost DBNAME=youdb DBUSER=dbusr DBPASS=dbpass jsonator5 languages#1
```

- If FILENAME is omitted it'll use `fixtures.json` in the current directory.
- If any of the DB params are omitted it'll take the DB driver defaults.

The last param is `<table name>#<row ID>` you want to add to the JSON file.

It will also add any foreign key relation needed.
