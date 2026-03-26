exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.string('reset_token_hash', 64).nullable().index();
    table.timestamp('reset_token_expires_at').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('reset_token_expires_at');
    table.dropColumn('reset_token_hash');
  });
};
