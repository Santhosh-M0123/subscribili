import { query } from '../config/db.config.js';

export const Business = {
  create: async (name, email) => {
    const result = await query(
      'INSERT INTO business(name, email) VALUES($1, $2) RETURNING *',
      [name, email]
    );
    return result.rows[0];
  },

  findById: async (id) => {
    const result = await query('SELECT * FROM business WHERE id = $1', [id]);
    return result.rows[0];
  },
};
