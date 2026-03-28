exports.up = function (knex) {
  return knex.schema.createTable('breathing_profiles', function (table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('name', 80).notNullable();
    table.integer('inhale_seconds').notNullable().defaultTo(4);
    table.integer('hold_seconds').notNullable().defaultTo(4);
    table.integer('exhale_seconds').notNullable().defaultTo(6);
    table.boolean('audio_enabled').notNullable().defaultTo(true);
    table.decimal('audio_level', 4, 2).notNullable().defaultTo(0.22);
    table.timestamps(true, true);

    table.foreign('user_id').references('users.id').onDelete('CASCADE');
    table.index(['user_id', 'created_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('breathing_profiles');
};