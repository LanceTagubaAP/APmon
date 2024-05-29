import { MongoClient, Db, Collection, ObjectId} from "mongodb";
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
    const pokemon = await collection.findOne<Pokemon>({ id: id });

    if (!pokemon) {
        throw new Error(`Pokemon with ID ${id} not found`);
    }

    const evolutionChain = await fetchEvolutionChain(id);
    const evolutionDetails = await getEvolutionDetails(evolutionChain, pokemon.name);

    return { ...pokemon, evolutionDetails };
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

export async function getPokemonFromUserr(userId: ObjectId, pokemonName: string) {
    try {
        const user = await usersCollection.findOne(
            { _id: userId, 'userPokemons.name': pokemonName },
            { projection: { 'userPokemons.$': 1 } }
        );

        if (!user || !user.userPokemons || user.userPokemons.length === 0) {
            console.error(`Pokémon with name ${pokemonName} not found for user ${userId}`);
            throw new Error('Pokémon not found');
        }

        return user.userPokemons[0];
    } catch (error) {
        console.error(`Error fetching Pokémon ${pokemonName} for user ${userId}:`, error);
        throw error;
    }
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
export const getUserByIdd = async (userId: ObjectId): Promise<User | null> => {
    try {
        const user = await usersCollection.findOne({ _id: userId });
        if (user) {
            return user;
        } else {
            console.error(`User with ID ${userId} not found`);
            return null;
        }
    } catch (error) {
        console.error(`Error fetching user by ID ${userId}:`, error);
        return null;
    }
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

export async function fetchEvolutionChain(id: number) {
    try {
        const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}/`);
        const speciesData = await speciesResponse.json();

        const evolutionChainUrl = speciesData.evolution_chain.url;
        const evolutionResponse = await fetch(evolutionChainUrl);
        const evolutionData = await evolutionResponse.json();

        return evolutionData;
    } catch (error) {
        console.error(`Failed to fetch evolution chain for Pokemon with ID ${id}`, error);
        throw error;
    }
}


export async function getEvolutionDetails(evolutionChain: any, pokemonName: string) {
    console.log("Evolution chain:", evolutionChain); // Log evolution chain data

    try {
        const evolutionDetails: any[] = [];
        let currentStage = evolutionChain.chain;

        while (currentStage) {
            const speciesName = currentStage.species.name;
            const evolvesTo = currentStage.evolves_to;

            console.log("Fetching data for:", speciesName); // Log species being fetched

            // Fetch additional details for the current evolution stage using fetchPokemonData
            const pokemonData = await fetchPokemonData(speciesName);
            console.log("Data fetched successfully for:", speciesName); // Log successful data fetch

            evolutionDetails.push({
                name: speciesName,
                isCurrent: speciesName.toLowerCase() === pokemonName.toLowerCase(),
                front_default: pokemonData.front_default // Use front_default from pokemonData
            });

            if (evolvesTo.length > 0) {
                currentStage = evolvesTo[0];
            } else {
                currentStage = null;
            }
        }

        console.log("Evolution details:", evolutionDetails); // Log evolution details
        return evolutionDetails;
    } catch (error) {
        console.error("Error fetching evolution details:", error); // Log any errors that occur
        throw error;
    }
}


export async function updateUserStreak(userId: ObjectId): Promise<boolean> {
    try {
        const result = await usersCollection.updateOne(
            { _id: userId },
            { $inc: { streak: 1 } }
        );

        if (result.modifiedCount > 0) {
            console.log(`User streak updated successfully for user ${userId}`);
            return true;
        } else {
            console.error(`Failed to update streak for user ${userId}`);
            return false;
        }
    } catch (error) {
        console.error(`Error updating streak for user ${userId}:`, error);
        return false;
   }
}
export async function updatePokemonHealthStreak(userId: ObjectId, pokemonName: string): Promise<boolean> {
    try {
        const result = await usersCollection.updateOne(
            { _id: userId, 'userPokemons.name': pokemonName },
            { $inc: { 'userPokemons.$.health': 1 } }
        );

        if (result.modifiedCount > 0) {
            console.log(`Health updated for Pokémon ${pokemonName} for user ${userId}`);
            return true;
        } else {
            console.error(`Failed to update health for Pokémon ${pokemonName} for user ${userId}`);
            return false;
        }
    } catch (error) {
        console.error(`Error updating health for Pokémon ${pokemonName} for user ${userId}:`, error);
        return false;
    }
}






