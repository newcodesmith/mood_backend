exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.integer('breathing_cycle_count').notNullable().defaultTo(5);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('breathing_cycle_count');
  });
};