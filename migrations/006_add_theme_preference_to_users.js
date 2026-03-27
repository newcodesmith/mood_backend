exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.string('theme_preference', 16).notNullable().defaultTo('light');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('theme_preference');
  });
};
