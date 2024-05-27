import { MongoClient, Db, Collection, ObjectId  } from "mongodb";
import { Pokemon, User , Rank } from "./interfaces";
import dotenv from "dotenv";
import bcrypt from "bcrypt";


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
        email:"",
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
export async function getPokemonFromUser(userId:number,pokemonId : number) {
    return await usersCollection.findOne( { id: userId, 'userPokemons.id': pokemonId })
}
export async function updateRank(user:User) {
    
}
export async function updateCatchedFromUser(pokemonId : number, userId : number) {
    
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
