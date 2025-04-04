import pg from 'pg'
const { Client } = pg

export const client = new Client({
    user: 'postgres',
    password: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'saco',
  })
// await client.connect()
 
// try {
//    const res = await client.query('SELECT $1::text as message', ['Hello world!'])
//    console.log(res.rows[0].message) // Hello world!
// } catch (err) {
//    console.error(err);
// } finally {
//    await client.end()
// }

// client.connect((err) => {
//     client.query('SELECT $1::text as message', ['Hello world!'], (err, res) => {
//       console.log(err ? err.stack : res.rows[0].message) // Hello World!
//       client.end()
//     })
//  })
  