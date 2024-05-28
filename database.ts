import { MongoClient, Db, Collection, ObjectId  } from "mongodb";
import { Pokemon, User , Rank } from "./interfaces";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { inflictDamage } from "./battle";


dotenv.config();
export const MONGODB_URI = process.env.MONGO_URI ?? "mongodb://localhost:27017";
export const client = new MongoClient(MONGODB_URI);


export const collection : Collection<Pokemon> = client.db("APmon").collection<Pokemon>("pokemons");
export const usersCollection : Collection<User> = client.db("APmon").collection<User>("users");

const saltRounds : number = 10;


export async function exit() {
    try {
        await client.close();
        console.log("Disconnected from database");
    } catch (error) {
        console.error(error);
    }
    process.exit(0);
}

export async function connect() {
    try {
        await client.connect();
        console.log("Connected to database");
        process.on("SIGINT", exit);
    } catch (error) {
        console.error(error);
    }
}
export async function fetchAndInsertPokemons(): Promise<void> {
    
    
    const pokemonsCount = await collection.countDocuments();
    if (pokemonsCount === 0) {
        
        const pokemons: Pokemon[] = await getFirst151PokemonFromAPI() //await response.json();
        await collection.insertMany(pokemons);
        console.log('Pokemons inserted into MongoDB');
    }else console.log('Pokemons already in MongoDB');


}

async function fetchPokemonData(id: number): Promise<Pokemon> {
    try {
        const [pokemonResponse, speciesResponse] = await Promise.all([
            fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
            fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`)
        ]);

        if (!pokemonResponse.ok || !speciesResponse.ok) {
            throw new Error(`Failed to fetch data for Pokemon with ID ${id}`);
        }

        const [pokemon, species] = await Promise.all([pokemonResponse.json(), speciesResponse.json()]);
        const description = species.flavor_text_entries.find((entry: any) => entry.language.name === 'en').flavor_text;

        return {
            id: pokemon.id,
            name: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
            types: pokemon.types.map((type: any) => type.type.name),
            health: pokemon.stats[0].base_stat,
            maxHealth: pokemon.stats[0].base_stat,
            attack: pokemon.stats[1].base_stat,
            defense: pokemon.stats[2].base_stat,
            description: description,
            isCatched: false,
            front_default: pokemon.sprites.front_default,
            back_default : pokemon.sprites.back_default,
            icon : ""
        };
    } catch (error) {
        console.error(`Failed to retrieve data for Pokemon with ID ${id}`, error);
        throw error;
    }
}

async function getFirst151PokemonFromAPI(): Promise<Pokemon[]> {
    const pokemonData: Pokemon[] = [];

    for (let i = 1; i <= 151; i++) {
        try {
            const pokemonInfo = await fetchPokemonData(i);
            pokemonData.push(pokemonInfo);
        } catch (error) {
            // Log the error and continue fetching the next Pokemon
            console.error(`Failed to retrieve data for Pokemon with ID ${i}`, error);
        }
    }
    
    
    console.log("Loading complete from API");
    return pokemonData;
}
export async function getPokemonCollection() {
    return await collection.find().toArray();
}

export async function seed() {
    let username : string | undefined = process.env.ADMIN_USER;
    let password : string | undefined = process.env.ADMIN_PASSWORD;
    if (username === undefined || password === undefined) {
        throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment");
    }

    const users : User[] = [{
        userName : username,
        password : await bcrypt.hash(password, saltRounds),
        userPetId : 1,
        userPokemons : await getFirst151PokemonFromAPI(),
        rank : Rank.Beginner, 
        email:"firstUser@hotmail.com",
        icon : "test",
        streak : 0,
    }]
    if (await usersCollection.countDocuments() === 0) {
        await usersCollection.insertMany(users);
        console.log("seed complete")
    }else console.log("Users already in db");

    
}
export async function getPokemon(id:number) {
    return await collection.findOne<Pokemon>({id : id});
}
export async function getPokemonFromUser(userId: ObjectId | undefined, pokemonId: number) {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const user = await usersCollection.findOne(
        { _id: userId, 'userPokemons.id': pokemonId },
        { projection: { 'userPokemons.$': 1 } }
    );

    if (!user || !user.userPokemons || user.userPokemons.length === 0) {
        throw new Error('Pokémon not found');
    }

    return user.userPokemons[0];
}
export async function updateCatchedFromUser(pokemonId : number, userId : ObjectId) {
    
    try {
        const result = await usersCollection.updateOne(
            { id: userId, 'userPokemons.id': pokemonId },
            { $set: { 'userPokemons.$.isCatched': true } }
        );

        if (result.matchedCount === 0) {
            console.log('No user or Pokémon found with the provided IDs.');
        } else {
            console.log('Pokémon catch status updated successfully.');
        }
    } catch (error) {
        console.error('Error updating Pokémon catch status:', error);
    }
}

export async function login(userName: string, password: string) {
    if (userName === "" || password === "") {
        throw new Error("Gebruiker of wachtwoord is vereist!");
    }
    let user : User | null = await usersCollection.findOne<User>({userName: userName});
    if (user) {
        if (await bcrypt.compare(password, user.password!)) {
            return user;
        } else {
            throw new Error("Wachtwoord is fout!");
        }
    } else {
        throw new Error("Gebruiker niet gevonden!");
    }
}

export const getUserById= async (userId: ObjectId): Promise<User | null> => {

    const user = await usersCollection.findOne({ _id: userId });
    return user;
};

export function getRankName(user: User): string {
    return Rank[user.rank];
}
export const updateUserRank = async (userId: ObjectId, newRank: Rank): Promise<boolean> => {
    try {
        // Check if the new rank is not higher than the highest rank
        if (newRank !== Rank.Legende) {
            await usersCollection.updateOne({ _id: userId }, { $set: { rank: newRank } });
            return true; // Return true if update is successful
        } else {
            console.log("User is already at the highest rank (Legende). Rank cannot be updated.");
            return false; // Return false indicating rank was not updated
        }
    } catch (error) {
        console.error("Error updating user rank:", error);
        return false; // Return false if update fails
    }
};

export function handleAttack(myPokemon : Pokemon , enemyPokemon : Pokemon){
    const turn1 = inflictDamage(myPokemon,enemyPokemon);
    const turn2 = inflictDamage(turn1.otherPokemon,turn1.myPokemon);
    //TODO BattleLog message meegeven
    return [turn2.myPokemon,turn2.otherPokemon];
}

export async function updateHPFromUser(pokemonId : number, userId : ObjectId,newHP:number) {
    
    try {
        const result = await usersCollection.updateOne(
            { id: userId, 'userPokemons.id': pokemonId },
            { $set: { 'userPokemons.$.HP': newHP } }
        );

        if (result.matchedCount === 0) {
            console.log('No user or Pokémon found with the provided IDs.');
        } else {
            console.log('Pokémon catch status updated successfully.');
        }
    } catch (error) {
        console.error('Error updating Pokémon HP status:', error);
    }
}

export async function updateAttackFromUser(pokemonId : number, userId : ObjectId,newAttack:number) {
    
    try {
        const result = await usersCollection.updateOne(
            { id: userId, 'userPokemons.id': pokemonId },
            { $set: { 'userPokemons.$.attack': newAttack } }
        );

        if (result.matchedCount === 0) {
            console.log('No user or Pokémon found with the provided IDs.');
        } else {
            console.log('Pokémon catch status updated successfully.');
        }
    } catch (error) {
        console.error('Error updating Pokémon Attack status:', error);
    }
}
export async function updateDefenseFromUser(pokemonId : number, userId : ObjectId,newDefense:number) {
    
    try {
        const result = await usersCollection.updateOne(
            { id: userId, 'userPokemons.id': pokemonId },
            { $set: { 'userPokemons.$.defense': newDefense } }
        );

        if (result.matchedCount === 0) {
            console.log('No user or Pokémon found with the provided IDs.');
        } else {
            console.log('Pokémon catch status updated successfully.');
        }
    } catch (error) {
        console.error('Error updating Pokémon Defense status:', error);
    }
}
