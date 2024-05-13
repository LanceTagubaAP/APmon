import { getFirst151Pokemon } from "./apicall";
import { Pokemon } from "./interfaces";

let data: Pokemon[] = [];
async function main() {
    console.log("waiting");
    data = await getFirst151Pokemon();
    console.log("loading complete");

    let pokemon1: Pokemon = data[150];
    let pokemon2: Pokemon = data[59];

    pokemon1.health = pokemon1.health * 8;
    pokemon2.health = pokemon2.health * 8;

    while (pokemon1.health > 0 && pokemon2.health > 0) {
        inflictDamage(pokemon1, pokemon2);
        if (pokemon2.health <= 0) {
            // Pokemon 2 fainted, exit the loop
            console.log(`${pokemon2.name} fainted , ${pokemon1.name} WON`)
            break;
        }
        inflictDamage(pokemon2, pokemon1);
        if (pokemon1.health <= 0) {
            // Pokemon 1 fainted, exit the loop
            console.log(`${pokemon1.name} fainted , ${pokemon2.name} WON`)
            break;

        }
    }





}

function inflictDamage(myPokemon: Pokemon, otherPokemon: Pokemon) {
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
main();