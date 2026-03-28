exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.string('breathing_color_palette', 24).notNullable().defaultTo('ocean');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('breathing_color_palette');
  });
};