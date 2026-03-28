exports.up = function (knex) {
  return knex.schema.alterTable('mood_entries', function (table) {
    table.decimal('water_oz', 6, 2).nullable();
    table.decimal('weight_lbs', 6, 2).nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('mood_entries', function (table) {
    table.dropColumn('weight_lbs');
    table.dropColumn('water_oz');
  });
};
