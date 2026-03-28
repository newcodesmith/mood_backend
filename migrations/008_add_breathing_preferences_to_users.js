exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.integer('breathing_inhale_seconds').notNullable().defaultTo(4);
    table.integer('breathing_hold_seconds').notNullable().defaultTo(4);
    table.integer('breathing_exhale_seconds').notNullable().defaultTo(6);
    table.boolean('breathing_audio_enabled').notNullable().defaultTo(true);
    table.decimal('breathing_audio_level', 4, 2).notNullable().defaultTo(0.22);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('breathing_inhale_seconds');
    table.dropColumn('breathing_hold_seconds');
    table.dropColumn('breathing_exhale_seconds');
    table.dropColumn('breathing_audio_enabled');
    table.dropColumn('breathing_audio_level');
  });
};