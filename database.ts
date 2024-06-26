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
        const evolutionChainUrl = species.evolution_chain.url;
        const evolutions = await fetchEvolutionChain(evolutionChainUrl);

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
            back_default: pokemon.sprites.back_default,
            icon: "",
            evolutions: evolutions
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
    return pokemon;
    
}
export async function updateHPfromPokemon(id: number, newHealth: number): Promise<void> {
    try {
        // Log the input parameters
        console.log(`Updating Pokémon with id ${id} to new health ${newHealth}`);

        // Perform the update operation
        const result = await collection.updateOne(
            { id: id }, // Filter criteria
            { $set: { health: newHealth } } // Update operation
        );

        // Log the result of the update operation
        console.log('Update result:', result);

        // Check if any documents matched the filter criteria
        if (result.matchedCount === 0) {
            console.log(`No Pokémon found with id ${id}`);
        } else if (result.modifiedCount === 0) {
            console.log(`No changes made to the health of Pokémon with id ${id}`);
        } else {
            console.log(`Successfully updated health for Pokémon with id ${id} globally`);
        }
    } catch (error) {
        // Log any errors that occur
        console.error('Error updating Pokémon health:', error);
    }
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

export function handleAttack(myPokemon : Pokemon , enemyPokemon : Pokemon,user : User){
    const turn1 = inflictDamage(myPokemon,enemyPokemon);
    const turn2 = inflictDamage(turn1.otherPokemon,turn1.myPokemon);
    //let message = `${myPokemon.name} heeft ${enemyPokemon.name} -${turn1.damage} gegeven en ${enemyPokemon.name} heeft ${myPokemon.name} -${turn2.damage} gegeven `;
    if (user._id) {
        updateHPFromUser(String(turn1.myPokemon.id),user._id,turn2.otherPokemon.health);
        updateHPfromPokemon((enemyPokemon.id),turn2.myPokemon.health );

    }
    
    return [turn2,turn1];
}
export async function handleOneAttack(myPokemon : Pokemon,enemyPokemon : Pokemon, user : User) {
    const turn1 = inflictDamage(myPokemon,enemyPokemon);
    if (user._id) {
        updateHPFromUser(String(turn1.myPokemon.id),user._id,turn1.myPokemon.health - turn1.damage);
    }
    return turn1;
} 

export async function updateHPFromUser(pokemonId: string, userId: ObjectId, newHP: number): Promise<void> {
    try {
        const pokemonIdInt = parseInt(pokemonId);

        // Log the input parameters
        console.log(`Updating HP for Pokémon with id ${pokemonIdInt} for user ${userId} to new HP ${newHP}`);

        // Perform the update operation
        const result = await usersCollection.updateOne(
            { _id: userId, 'userPokemons.id': pokemonIdInt },
            { $set: { 'userPokemons.$.health': newHP } }
        );

        // Log the query and update result
        console.log('Query:', { _id: userId, 'userPokemons.id': pokemonIdInt });
        console.log('Update:', { $set: { 'userPokemons.$.HP': newHP } });
        console.log('Update result:', result);

        // Check if any documents matched the filter criteria
        if (result.matchedCount === 0) {
            console.log('No user or Pokémon found with the provided IDs.');
        } else if (result.modifiedCount === 0) {
            console.log('No changes made to the Pokémon HP.');
        } else {
            console.log('Pokémon HP updated successfully.');
        }
    } catch (error) {
        // Log any errors that occur
        console.error('Error updating Pokémon HP:', error);
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

export async function getUserPokemonsSortedByIsCatched(userId: ObjectId) {

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) throw new Error('User not found');

    const caughtPokemons = user.userPokemons.filter(pokemon => pokemon.isCatched);
    
    const sortedPokemons = caughtPokemons.sort((a: Pokemon, b: Pokemon) => {
        return (a.isCatched === b.isCatched) ? 0 : a.isCatched ? -1 : 1;
    });

    return sortedPokemons;
}

export async function updatePartnerPokemon(userId: ObjectId, newPokemonId: number): Promise<void> {
    try {
        const foundUser = await usersCollection.findOne({ _id: userId });

        if (foundUser) {
            // Zoek de huidige Pokémon van de gebruiker
            const currentPokemon = foundUser.userPokemons.find(pokemon => pokemon.id === foundUser.userPetId);

            // Controleer of de huidige Pokémon bestaat en gevangen is
            if (currentPokemon && currentPokemon.isCatched) {
                // Voer de update alleen uit als de huidige Pokémon gevangen is
                const result = await usersCollection.updateOne(
                    { _id: userId }, 
                    { $set: { userPetId: newPokemonId } }
                );

                if (result.matchedCount === 0) {
                    console.log('Geen gebruiker gevonden met de opgegeven ID.');
                } else {
                    console.log('Gebruikerspartner succesvol bijgewerkt.');
                }
            } else {
                console.log('Huidige Pokémon is niet gevangen, dus kan niet worden gewijzigd.');
            }
        } else {
            console.log('Gebruiker niet gevonden.');
        }
    } catch (error) {
        console.error('Fout bij het bijwerken van de gebruikerspartner:', error);
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






