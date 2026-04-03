exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.string('display_name', 50).nullable().defaultTo(null);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('display_name');
  });
};
