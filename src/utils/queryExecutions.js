
import { client } from "../config/db.config.js";

export const runQuery = async (q) => {
    try {
        // eq -> execute query
        const eq = await client.query(q);
        console.log(eq?.rows);
        if(eq){
            return true;
        }
    } catch (error) {
        console.log(error)
    }
}