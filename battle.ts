import { getFirst151Pokemon } from "./apicall";
import { Pokemon } from "./interfaces";

export function inflictDamage(myPokemon: Pokemon, otherPokemon: Pokemon) {
    // Damage = (ad^2 / defense)
    let modA = otherPokemon.defense / myPokemon.attack;
    let modD = myPokemon.attack / otherPokemon.defense;

    const random = Math.random();
    let critChanceMod = 1;

    if (random <= 0.15) {
        critChanceMod = 2;
        console.log("CRIT")
    }

    let damage = critChanceMod * (Math.pow(myPokemon.attack * modA, 2)) / otherPokemon.defense * modD;
    const damageNerf = 0.125;
    damage *= damageNerf;

   
    console.log(` 
    ${myPokemon.name} HP: ${myPokemon.health}
    ${otherPokemon.name} HP: ${otherPokemon.health}

    ${myPokemon.name} gave ${damage} to ${otherPokemon.name}
                    
    `);
    otherPokemon.health -= damage;

    return {
        myPokemon : myPokemon,
        otherPokemon : otherPokemon,
    }


}

export function checkWin(enemyPokemon : Pokemon){
    if (enemyPokemon.health <= 0) {
        return true;
    } else {
        return false;
    }
}
export function restoreHealth(pokemon : Pokemon){
    pokemon.health = pokemon.maxHealth;
    return pokemon;
}
export function catchPokemon(currentHP: number, maxHP: number = 100): boolean {
    // Base catch rate is 20%
    const baseCatchRate = 0.2;
    
    // Calculate the modified catch rate based on the current HP
    const hpFactor = (maxHP - currentHP) / maxHP;
    const modifiedCatchRate = baseCatchRate + (hpFactor * baseCatchRate);

    // Ensure the catch rate doesn't exceed 100%
    const finalCatchRate = Math.min(modifiedCatchRate, 1);

    // Generate a random number between 0 and 1
    const randomNumber = Math.random();

    // Determine if the Pokémon is caught
    return randomNumber < finalCatchRate;
}