exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.string('email', 255).unique().nullable();
    table.string('password_hash', 255).nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('password_hash');
    table.dropColumn('email');
  });
};
