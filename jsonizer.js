#!/usr/bin/env node

(async function main () {
  try {
    const FILENAME = process.env.FILENAME || "fixtures.json";
    const database = process.env.DBNAME;
    const target = process.argv[2].split("#");
    const [targetTable, targetID] = target;

    const fs = require("fs");  
    const fixtures = fs.existsSync(FILENAME) ? JSON.parse(fs.readFileSync(FILENAME)) : {};
    const knex = require("knex")({ client: "pg", connection: { database }});
    const [row] = await knex(targetTable).where({ id: targetID });

    if(!fixtures[targetTable]) fixtures[targetTable] = [];
    fixtures[targetTable].push(row);
    
    fs.writeFileSync(FILENAME, JSON.stringify(fixtures, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
