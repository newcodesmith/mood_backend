exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.unique('name');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropUnique('name');
  });
};
