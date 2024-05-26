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

   
    console.log(` 
    ${myPokemon.name} HP: ${myPokemon.health}
    ${otherPokemon.name} HP: ${otherPokemon.health}

    ${myPokemon.name} gave ${damage} to ${otherPokemon.name}
                    
    `);
    otherPokemon.health -= damage;


}

export function checkWin(pokemon:Pokemon){
    if (pokemon.health <= 0) {
        return true;
    } else {
        return false;
    }
}
