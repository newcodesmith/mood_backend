exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.text('avatar').nullable().alter();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.string('avatar').nullable().alter();
  });
};
