exports.up = function(knex) {
  return knex.schema.createTable('mood_entries', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.date('date').notNullable();
    table.integer('mood').notNullable();
    table.json('feelings').notNullable();
    table.text('reflection').nullable();
    table.decimal('sleep', 4, 2).nullable();
    table.timestamps(true, true);
    table.unique(['user_id', 'date']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('mood_entries');
};
