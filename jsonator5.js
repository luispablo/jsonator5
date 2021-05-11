#!/usr/bin/env node

const addRow = async function addRow (fixtures, knex, table, id) {
  const [row] = await knex(table).where({ id });
  if (!row) throw new Error(`${table}#${id} not found!`);
  if(!fixtures[table]) fixtures[table] = [];
  fixtures[table].push(row);
};

const getTableFKs = async function getTableFKs (knex, table) {
  const res = await knex.raw(`
    SELECT  tc.table_name
    ,       kcu.column_name
    ,       ccu.table_name    AS foreign_table_name
    ,       ccu.column_name   AS foreign_column_name 
    FROM    information_schema.table_constraints AS tc 
    JOIN    information_schema.key_column_usage AS kcu 
    ON      tc.constraint_name = kcu.constraint_name 
    AND     tc.table_schema = kcu.table_schema
    JOIN    information_schema.constraint_column_usage AS ccu 
    ON      ccu.constraint_name = tc.constraint_name 
    AND     ccu.table_schema = tc.table_schema
    WHERE   tc.constraint_type = 'FOREIGN KEY' 
    AND     tc.table_name = '${table}';
  `);
  return res.rows;
};

const sanityCheck = async function sanityCheck (fixtures, knex) {
  const newRows = [];
  
  for (table of Object.keys(fixtures)) {
    const tableFks = await getTableFKs(knex, table);

    for (row of fixtures[table]) {
      // Review each row non-empty FKs values
      const presentFKs = tableFks.filter(fk => row[fk.column_name]);

      for (fk of presentFKs) {
        const rowFKValue = row[fk.column_name];
        const fixtureTable = fixtures[fk.foreign_table_name]; 
        const [fkRow] = (fixtureTable || []).filter(r => r[fk.foreign_column_name] === rowFKValue);
        if (!fixtureTable || !fkRow) newRows.push(await addRow(fixtures, knex, fk.foreign_table_name, rowFKValue));
      }
    }
  }

  return newRows;
};

(async function main () {
  try {
    const FILENAME = process.env.FILENAME || "fixtures.json";
    const database = process.env.DBNAME;
    const user = process.env.DBUSER;
    const password = process.env.DBPASS;
    const host = process.env.DBHOST;
    const target = process.argv[2].split("#");
    const [targetTable, targetID] = target;

    const fs = require("fs");
    const fixtures = fs.existsSync(FILENAME) ? JSON.parse(fs.readFileSync(FILENAME)) : {};

    const knex = require("knex")({ client: "pg", connection: { host, database, user, password }});
    const [currentValue] = (fixtures[targetTable] || []).filter(r => r.id === parseInt(targetID));

    if (currentValue) {
      console.error(`${targetTable} with ID ${targetID} already exists in JSON file`);
      process.exit(1);
    } else {
      // Add requested row
      await addRow(fixtures, knex, targetTable, targetID);
      // Fix any issue
      let sanityCheckNewRows = await sanityCheck(fixtures, knex);
      while (sanityCheckNewRows.length) sanityCheckNewRows = await sanityCheck(fixtures, knex);
      // Finally write to file
      fs.writeFileSync(FILENAME, JSON.stringify(fixtures, null, 2));
      process.exit(0);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
