import express from "express";
import { getFirst151Pokemon } from "./apicall";
import { Pokemon, User } from "./interfaces";
import dotenv from "dotenv";
import { connect, fetchAndInsertPokemons, getPokemon, getPokemonCollection, seed, login, getUserById, getRankName } from "./database";
import session from "./session";
import { secureMiddleware } from "./secureMiddleware";
import { loginRouter } from "./routes/loginRouter";
import { homeRouter } from "./routes/homeRouter";
import exp from "constants";
import cookieparser from "cookie-parser";


const app = express();
const port = process.env.PORT || 3000;
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }))
app.set("port", port);
app.use(express.static("public"));
app.use(session);
app.use(loginRouter());
app.use(homeRouter());
app.set("view engine", "ejs");

app.use(cookieparser());

let data: Pokemon[] = [];

app.get("/", (req, res) => {
    /**Hier komt eerste pagina */
    res.render("/")
});

app.get("/titleScreen", (req, res) => {
    /**Hier komt titleScreen pagina */
    res.render("titleScreen");
});

app.get("/signup", (req, res) => {
    /**Hier komt signup pagina */
    let sprites = [];
    for (let index = 0; index < 7; index++) {
        let sprite = data[index].front_default;
        index += 2;
        sprites.push(sprite);
    }
    res.render("signup", {
        sprites: sprites
    });
});

app.get("/login", (req, res) => {
    /**Hier komt login pagina */
    res.render("login");
});

app.post("/login", async (req, res) => {
    const username: string = req.body.usernameInput;
    const password: string = req.body.passwordInput;
    try {
        let user: User = await login(username, password);
        delete user.password;
        req.session.user = user;
        res.redirect("/mainpage")
    } catch (e: any) {
        res.redirect("/login");
    }
});

app.get("/logout", async (req, res) => {
    req.session.destroy(() => {
        res.redirect("/login");
    });
});

app.get("/battle/:id", async (req, res) => {
    /**Hier komt battle pagina */
    const pokemonId = parseInt(req.params.id);
    if (req.session.user) {
        let userId = req.session.user._id;
        if (userId) {  // Check if userId is defined
            let foundUser = await getUserById(userId);
            if (foundUser) {  // Check if foundUser is not null
                let userpetId = foundUser.userPetId;
                let userPokemon = foundUser.userPokemons[userpetId - 1];
                const enemyPokemon = await getPokemon(pokemonId);
                let rankName = getRankName(foundUser);
                if (enemyPokemon) {
                    res.render("battle", {
                        user: foundUser,
                        pokemon: userPokemon,
                        enemyPokemon: enemyPokemon,
                        data: data
                    });
                } else {
                    res.status(404).send("Pokemon not found");
                }

            } else {
                res.status(404).send("User not found");
            }
        } else {
            res.status(400).send("User ID is not defined");
        }
    } else {
        res.status(401).send("User not logged in");
    }


});



app.get("/mainpage", secureMiddleware, async (req, res) => {
    /**Hier komt menu pagina */

    if (req.session.user) {
        let userId = req.session.user._id;
        if (userId) {  // Check if userId is defined
            let foundUser = await getUserById(userId);
            if (foundUser) {  // Check if foundUser is not null
                let userpetId = foundUser.userPetId;
                let userPokemon = foundUser.userPokemons[userpetId - 1];
                let rankName = getRankName(foundUser);
                res.render("mainpage", { user: foundUser, pokemon: userPokemon, rankName: rankName });
            } else {
                res.status(404).send("User not found");
            }
        } else {
            res.status(400).send("User ID is not defined");
        }
    } else {
        res.status(401).send("User not logged in");
    }
});

app.get("/battlechoose", secureMiddleware, async (req, res) => {
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
    let randomNumber2: number = Math.floor(Math.random() * 151) + 1;
    let randomNumber3: number = Math.floor(Math.random() * 151) + 1;
    let randomPokemon: Pokemon = data[randomNumber];
    let randomPokemon2: Pokemon = data[randomNumber2];
    let randomPokemon3: Pokemon = data[randomNumber3];


    if (req.session.user) {
        let userId = req.session.user._id;
        if (userId) {  // Check if userId is defined
            let foundUser = await getUserById(userId);
            if (foundUser) {  // Check if foundUser is not null
                let userpetId = foundUser.userPetId;
                let userPokemon = foundUser.userPokemons[userpetId - 1];
                let rankName = getRankName(foundUser);
                res.render("battlechoose", {
                    user: foundUser,
                    pokemon: userPokemon,
                    rankName: rankName,
                    randomPokemon: randomPokemon,
                    randomPokemon2: randomPokemon2,
                    randomPokemon3: randomPokemon3,
                    data: data
                });
            } else {
                res.status(404).send("User not found");
            }
        } else {
            res.status(400).send("User ID is not defined");
        }
    } else {
        res.status(401).send("User not logged in");
    }


});

app.get("/pokedex", (req, res) => {
    const fixedPokemonId = 1;
    const fixedPokemon = data.find(p => p.id === fixedPokemonId);

    res.render("pokedex", { data: data, fixedPokemon: fixedPokemon });
});

app.get("/pokedex/:id", (req, res) => {
    const pokemonId = parseInt(req.params.id);
    const pokemon = data.find(p => p.id === pokemonId);
    if (pokemon) {
        res.render("pokedexDetail", {
            pokemon: pokemon,
            data: data
        });
    } else {
        res.status(404).send("Pokemon not found");
    }
});


app.get("/compare/:id", (req, res) => {
    const pokemonId = parseInt(req.params.id);
    const pokemon = data.find(p => p.id === pokemonId);
    if (pokemon) {
        res.render("compare", {
            pokemon: pokemon,
            data: data
        });
    } else {
        res.status(404).send("Pokemon not found");
    }
});



app.get("/whosthatpokemon", async (req, res) => {
    /**Hier komt Who's that pokemon pagina */

    let randomNumber: number = Math.floor(Math.random() * 151) + 1;
    let randomPokemon: Pokemon = data[randomNumber];
    res.render("whosthatpokemon", {
        randomSprite: randomPokemon.front_default,
    });

    if (req.session.user) {
        let userId = req.session.user._id;
        if (userId) {  // Check if userId is defined
            let foundUser = await getUserById(userId);
            if (foundUser) {  // Check if foundUser is not null
                let userpetId = foundUser.userPetId;
                let userPokemon = foundUser.userPokemons[userpetId - 1];
                let rankName = getRankName(foundUser);
            } else {
                res.status(404).send("User not found");
            }
        } else {
            res.status(400).send("User ID is not defined");
        }
    } else {
        res.status(401).send("User not logged in");
    }


    document.addEventListener('DOMContentLoaded', async () => {
        const inputField = document.getElementById('inputField') as HTMLInputElement;
        const suggestionList = document.getElementById('suggestionList') as HTMLUListElement;

        const pokemonList: Pokemon[] = await getFirst151Pokemon();

        inputField.addEventListener('input', () => {
            const query = inputField.value.toLowerCase();
            suggestionList.innerHTML = '';

            if (query) {
                const filteredSuggestions = pokemonList.filter(pokemon => pokemon.name.toLowerCase().startsWith(query));

                filteredSuggestions.forEach(pokemon => {
                    const li = document.createElement('li');
                    const img = document.createElement('img');
                    img.src = pokemon.front_default;
                    const span = document.createElement('span');
                    span.textContent = pokemon.name;

                    li.appendChild(img);
                    li.appendChild(span);
                    suggestionList.appendChild(li);

                    li.addEventListener('click', () => {
                        inputField.value = pokemon.name;
                        suggestionList.innerHTML = '';
                        suggestionList.style.display = 'none';
                    });
                });

                if (filteredSuggestions.length > 0) {
                    suggestionList.style.display = 'block';
                } else {
                    suggestionList.style.display = 'none';
                }
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











app.get("/howtoplay", async (req, res) => {
    /**Hier komt how to play pagina */
    if (req.session.user) {
        let userId = req.session.user._id;
        if (userId) {  // Check if userId is defined
            let foundUser = await getUserById(userId);
            if (foundUser) {  // Check if foundUser is not null
                let userpetId = foundUser.userPetId;
                let userPokemon = foundUser.userPokemons[userpetId - 1];
                res.render("howtoplay", { user: foundUser, pokemon: userPokemon });
            } else {
                res.status(404).send("User not found");
            }
        } else {
            res.status(400).send("User ID is not defined");
        }
    } else {
        res.status(401).send("User not logged in");
    }
});


/**Bij opstarten van server data inladen van DB van API/DB */
/**
 * 
 */

app.listen(app.get("port"), async () => {
    console.log("[server] http://localhost:" + app.get("port"));
    await connect();
    await seed();
    await fetchAndInsertPokemons();

    data = await getPokemonCollection();

}
);