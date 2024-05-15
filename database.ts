import { MongoClient, Db, Collection, ObjectId  } from "mongodb";
import { Pokemon, User , Rank } from "./interfaces";
import dotenv from "dotenv";


dotenv.config();
const uri = process.env.MONGO_URI;
export const client = new MongoClient(uri || "mongodb://localhost:27017/mydb");
export const collection : Collection<Pokemon> = client.db("APmon").collection<Pokemon>("pokemons");
export const usersCollection : Collection<User> = client.db("APmon").collection<User>("users");


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
    
    const pokemonsCollection: Collection<Pokemon> = client.db("APmon").collection<Pokemon>("pokemons");
    const pokemonsCount = await pokemonsCollection.countDocuments();
    if (pokemonsCount === 0) {
        
        const pokemons: Pokemon[] = await getFirst151Pokemon() //await response.json();
        await pokemonsCollection.insertMany(pokemons);
        console.log('Pokemons inserted into MongoDB');
    }

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
            icon : pokemon.sprites.versions['generation-vii']?.icons[0].front_default
        };
    } catch (error) {
        console.error(`Failed to retrieve data for Pokemon with ID ${id}`, error);
        throw error;
    }
}

async function getFirst151Pokemon(): Promise<Pokemon[]> {
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
    
    console.log("Loading complete");
    return pokemonData;
}
export async function seed() {
    const users : User[] = [{
        id : 1,
        userName : "Lance",
        password : "123",
        userPokemons : await getFirst151Pokemon(),
        rank : Rank.Beginner, 
        icon : "test",
        streak : 0,
    }]
    if (await usersCollection.countDocuments() === 0) {
        await usersCollection.insertMany(users);
    }
    console.log("seed complete")
}