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

const imageUrls = [
    'https://raw.githubusercontent.com/EdisonTsang/jsonHost/main/X-headshot.jpg',
    'https://raw.githubusercontent.com/EdisonTsang/jsonHost/main/Girl-headshot.jpg',
    'https://raw.githubusercontent.com/EdisonTsang/jsonHost/main/Boy-headshot.jpg'
];

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
export async function getPokemonFromUser(userId:number,pokemonId : number) {
    return await usersCollection.findOne( { id: userId, 'userPokemons.id': pokemonId })
}
export async function updateRank(user:User) {
    
}
export async function updateCatchedFromUser(pokemonId: string, userId: ObjectId) {
    try {
        const result = await usersCollection.updateOne(
            { _id: userId, 'userPokemons.id': parseInt(pokemonId) }, // Parse pokemonId as an integer
            { $set: { 'userPokemons.$.isCatched': true } }
        );

        if (result.matchedCount === 0) {
            console.log('No user or Pokémon found with the provided IDs.');
        } else {
            console.log('Pokémon catch status updated successfully.');
        }
        console.log("User ID:", userId);
        console.log("Pokemon ID:", pokemonId);
        console.log("Filter condition:", { _id: userId, 'userPokemons.id': pokemonId });
        console.log("Update result:", result);
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
export async function registerUser(userName: string, email: string, password: string, icon: string, userPetId: number): Promise<User> {
    try {
        if (!userName || !email || !password || !icon || !userPetId) {
            throw new Error('Alle velden moeten ingevuld zijn');
        }

        // Controleer of de gebruiker al bestaat op basis van het e-mailadres of de gebruikersnaam
        const existingUser = await usersCollection.findOne({ $or: [{ email }, { userName }] });
        if (existingUser) {
            throw new Error('Gebruiker met dit e-mailadres of gebruikersnaam bestaat al');
        }

        // Hash het wachtwoord voordat het wordt opgeslagen
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Maak een nieuw gebruikersobject aan met de ontvangen gegevens

        const newUser: User = { 
            userName,
            email, 
            password: hashedPassword, 
            icon,
            userPetId,
            userPokemons: await getPokemonCollection(), // Dit moet worden ingesteld afhankelijk van je vereisten
            rank: Rank.Beginner,
            streak: 0,
        };


        console.log('Gebruiker is aangemaakt.');

        // Voeg de nieuwe gebruiker toe aan de database
        await usersCollection.insertOne(newUser);
        return newUser;
    } catch (error) {
        console.error("Fout bij het registreren van de gebruiker: ", error);
        throw error;
    }
} 
