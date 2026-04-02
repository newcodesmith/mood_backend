exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.string('breathing_visual_shape', 24).notNullable().defaultTo('orb');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('breathing_visual_shape');
  });
};
