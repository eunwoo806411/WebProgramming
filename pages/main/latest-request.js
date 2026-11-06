// Each view has its own generation. A previous request may finish, but cannot commit.
export function createLatestRequest(){let generation=0;return {invalidate(){generation++;},async run(load){const token=++generation;try{const value=await load();return {current:token===generation,value};}catch(error){if(token!==generation)return {current:false};throw error;}}};}
