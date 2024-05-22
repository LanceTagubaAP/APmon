import express from "express";
import { getFirst151Pokemon } from "./apicall";
import { Pokemon } from "./interfaces";

const app = express();

app.set("port", 3000);
app.use(express.static("public"));
app.set("view engine", "ejs");

let data: Pokemon[] = [];

app.get("/", (req, res) => {
    /**Hier komt eerste pagina */
    res.render("index");
});

app.get("/titleScreen", (req, res) => {
    /**Hier komt titleScreen pagina */
    res.render("titleScreen");
});

app.get("/signup", (req, res) => {
    /**Hier komt signup pagina */
    res.render("signup");
});

app.get("/login", (req, res) => {
    /**Hier komt login pagina */
    res.render("login");
});

app.get("/battle", (req, res) => {
    /**Hier komt battle pagina */
    res.render("battle");
});

app.get("/compare", (req, res) => {
    /**Hier komt compare pagina */
    res.render("compare");
});

app.get("/mainpage", (req, res) => {
    /**Hier komt menu pagina */
    res.render("mainpage");
});
app.get("/battlechoose", (req, res) => {
    /**Hier komt pokemon vechten pagina */
    /** TODO: Random pokemons voor aanbevolen pokemons tonen 
     *  Gebruik een fetch om naam,sprite,HP,Attack en defense op te halen
     */
    /**Eerst random nummers genereren om dan daarop API call te doen voor random pokemons
     * 
     * getName() geeft een promise terug en doen pas render als deze voltooid is
     * 
     * 
     * 
     */
    let randomNumber: number = Math.floor(Math.random() * 151) + 1;
    let randomPokemon: Pokemon = data[randomNumber];
    console.log(randomPokemon);
    res.render("battlechoose", {
        randomName: randomPokemon.name,
        randomSprite: randomPokemon.sprite,
        randomHP: randomPokemon.health,
        randomAD: randomPokemon.attack,
        randomDF: randomPokemon.defense
    });



});

app.get("/pokedex", (req, res) => {
    /**Hier komt pokedex pagina */
    res.render("pokedex");
});

app.get("/whosthatpokemon", (req, res) => {
    /**Hier komt Who's that pokemon pagina */


    let randomNumber: number = Math.floor(Math.random() * 151) + 1;
    let randomPokemon: Pokemon = data[randomNumber];

    console.log(randomPokemon);
    res.render("whosthatpokemon", {
        randomSprite: randomPokemon.sprite

    });

    let clickCount: number = 0;
    document.getElementById("arrow")?.addEventListener("click", () => {
        if (clickCount === 5) {
            showPokemonSprite();
            clickCount = 0;
        }
    });

    function showPokemonSprite(pokemonName: string): void {
        const randomSprite = document.getElementById("pokemon") as HTMLImageElement | null;

        // Check if a valid image element is found
        if (randomSprite) {
            // Check if the entered Pokemon name matches a condition
            if (pokemonName.toLowerCase() === "pikachu") {
                // If the name is "pikachu", set brightness to 100%
                randomSprite.style.filter = "brightness(100%)";
            } else {
                // For other names, set brightness to a lower value, e.g., 50%
                randomSprite.style.filter = "brightness(50%)";
            }
        }
    }

    const inputField = document.getElementById("pokemonInput") as HTMLInputElement | null;

    // Check if the input field is valid
    if (inputField) {
        inputField.addEventListener("input", function () {
            const inputValue: string = inputField.value;
            showPokemonSprite(inputValue);
        });
    }


    document.addEventListener('DOMContentLoaded', async () => {
        const inputField = document.getElementById('inputField') as HTMLInputElement;
        const suggestionList = document.getElementById('suggestionList') as HTMLUListElement;

        let pokemonList: Pokemon[] = [];

        // Fetch Pokémon data
        try {
            pokemonList = await getFirst151Pokemon();
        } catch (error) {
            console.error('Error fetching Pokémon data:', error);
        }

        inputField.addEventListener('input', () => {
            const query = inputField.value.toLowerCase();
            suggestionList.innerHTML = '';

            if (query) {
                const filteredSuggestions = pokemonList.filter(pokemon => pokemon.name.toLowerCase().startsWith(query));

                filteredSuggestions.forEach(pokemon => {
                    const li = document.createElement('li');
                    const img = document.createElement('img');
                    img.src = pokemon.sprite;
                    img.alt = pokemon.name;
                    img.width = 100;
                    img.height = 100;
                    const span = document.createElement('span');
                    span.textContent = pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);

                    li.appendChild(img);
                    li.appendChild(span);
                    suggestionList.appendChild(li);

                    li.addEventListener('click', () => {
                        inputField.value = pokemon.name;
                        suggestionList.innerHTML = '';
                        suggestionList.style.display = 'none';
                    });
                });

                suggestionList.style.display = filteredSuggestions.length > 0 ? 'block' : 'none';
            } else {
                suggestionList.style.display = 'none';
            }
        });

        document.addEventListener('click', (e) => {
            if (!inputField.contains(e.target as Node) && !suggestionList.contains(e.target as Node)) {
                suggestionList.style.display = 'none';
            }
        });
    });


});

app.get("/howtoplay", (req, res) => {
    /**Hier komt how to play pagina */
    res.render("howtoplay");
});


/**Bij opstarten van server data inladen van DB van API/DB */
/**
 * 
 */

app.listen(app.get("port"), async () => {
    console.log("[server] http://localhost:" + app.get("port"));

    data = await getFirst151Pokemon();

}
);