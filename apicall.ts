import { Pokemon } from "./interfaces";

export async function getFirst151Pokemon(): Promise<Pokemon[]> {
    const pokemonData: Pokemon[] = [];

    for (let i = 1; i <= 151; i++) {
        try {
            const pokemonResponse = await fetch(`https://pokeapi.co/api/v2/pokemon/${i}`);
            const pokemon = await pokemonResponse.json();

            const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${i}/`);
            const species = await speciesResponse.json();
            const description = species.flavor_text_entries.find((entry: any) => entry.language.name === 'en').flavor_text;

            const pokemonInfo: Pokemon = {
                id: pokemon.id,
                name: pokemon.name.charAt(0).toUpperCase() +pokemon.name.slice(1) ,
                types: pokemon.types.map((type: any) => type.type.name),
                health: pokemon.stats[0].base_stat,
                attack: pokemon.stats[1].base_stat,
                defense: pokemon.stats[2].base_stat,
                description: description,
                isCatched: false,
                sprite: pokemon.sprites.front_default
            };

            pokemonData.push(pokemonInfo);
        } catch (error) {
            console.error(`Failed to retrieve data for Pokemon with ID ${i}`, error);
        }
    }
    console.log("loading complete");
    return pokemonData;
}

