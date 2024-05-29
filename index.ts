import express from "express";
import { getFirst151Pokemon } from "./apicall";
import { Pokemon, User } from "./interfaces";
import dotenv from "dotenv";

import { connect, fetchAndInsertPokemons, getPokemon, getPokemonCollection, seed, login, getUserById, registerUser, updateCatchedFromUser, getRankName, handleAttack, getPokemonFromUser, getUserPokemonsSortedByIsCatched,updatePartnerPokemon,handleOneAttack,updateHPFromUser, updateHPfromPokemon } from "./database";

import session from "./session";
import { secureMiddleware } from "./secureMiddleware";
import { loginRouter } from "./routes/loginRouter";
import { homeRouter } from "./routes/homeRouter";
import exp from "constants";
import cookieparser from "cookie-parser";
import path from "path";
import { catchPokemon, getRandomUniqueNumbers } from "./battle";
import { Data } from "ejs";
import { updatePokemonHealthStreak,getPokemonFromUserr } from "./database";
import { ObjectId } from "mongodb"; 




const app = express();
const port = process.env.PORT || 3000;
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }))
app.set("port", port);
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, 'public')));
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
        res.redirect("/titleScreen");
    });
});

app.get("/signup", async (req, res) => {
    res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
    const { usernameInput, emailInput, passwordInput, icon, userPetId } = req.body;
    try {
        // Roep de registerUser-functie aan met de ontvangen gegevens
        const user = await registerUser(usernameInput, emailInput, passwordInput, icon, parseInt(userPetId));
        if (user._id) {
            updateCatchedFromUser(userPetId, user._id)
            // Na succesvol registreren, doorsturen naar de hoofdpagina
            res.redirect('/login');
        }
        else {
            console.log('Probleem met aanmaken van user')
        }

    } catch (error: any) { // Gebruik 'any' om elke vorm van error toe te laten
        // Als er een fout optreedt, stuur een foutmelding terug naar de client
        const errorMessage = error.message || "Internal server error";
        res.status(400).send(errorMessage);
    }
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
                        rankName: rankName,
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
app.post("/battle/:id", async (req, res) => {
    try {
        // Logic to handle attacks (e.g., calculate damage, update HP)
        // You may want to pass information about the attacking and defending Pokémon in the request body
        // This function should return updated HP values for both Pokémon
        // const updatedHP = handleAttack(req.body.attacker, req.body.defender);
        if (req.session.user?._id) {
            if (req.body.attack) {
                console.log("route attack")
                let myUser = await getUserById(req.session.user?._id);
                if (myUser) {
                    let enemyPokemon = await getPokemon(parseInt(req.params.id));
                    let myPokemon = await getPokemonFromUser(myUser?._id, myUser?.userPetId);
                    if (enemyPokemon) {
                        const [turn2, turn1] = handleAttack(myPokemon, enemyPokemon,myUser);
                        // updateHPFromUser(myPokemon.id,myUser._id)
                        if (turn2.myPokemon.health <= 0) {
                            if (myUser?._id) {
                                updateCatchedFromUser(String(turn2.myPokemon.id),myUser?._id);
                                updateHPfromPokemon(turn2.myPokemon.id,turn2.myPokemon.maxHealth);
                                updateHPFromUser(String(turn2.otherPokemon.id),myUser._id,turn2.otherPokemon.maxHealth);
                            }
                            
                        }
                        
                        res.json({ turn2, turn1 });
                    }


                }
            }
            if (req.body.catch) {
                console.log("route catch")
                let myUser = await getUserById(req.session.user._id);
                if (myUser) {
                    let enemyPokemon = await getPokemon(parseInt(req.params.id));
                    let myPokemon = await getPokemonFromUser(myUser?._id, myUser?.userPetId);
                    if (enemyPokemon) {
                        const catched = catchPokemon(enemyPokemon?.health,enemyPokemon?.maxHealth);
                        let turn1;
                        if (myUser._id) {
                            if (!catched) {
                                turn1 = handleOneAttack(enemyPokemon, myPokemon,myUser);
                                
                            } else {
                                console.log("CATCHED NICE")
                                updateCatchedFromUser(String(enemyPokemon.id),myUser._id)
                            }
                        }
                        res.json({catched,turn1});
                        
                        
                        


                    }

                }
            }



        }


        // Send the updated HP values as a response
        // res.json(updatedHP);
    } catch (error) {
        console.error("Error handling attack:", error);
        res.status(500).send("Internal Server Error");
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
    const [randomNumber, randomNumber2, randomNumber3] = getRandomUniqueNumbers(151, 3);

    const randomPokemon: Pokemon | undefined = data[randomNumber];
    const randomPokemon2: Pokemon | undefined = data[randomNumber2];
    const randomPokemon3: Pokemon | undefined = data[randomNumber3];

    if (!randomPokemon || !randomPokemon2 || !randomPokemon3) {
        throw new Error("Failed to retrieve one or more Pokémon.");
    }


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

app.get("/pokedex", secureMiddleware, async(req, res) => {
    const fixedPokemonId = 1;
    const fixedPokemon = data.find(p => p.id === fixedPokemonId);

    if (req.session.user) {
        let userId = req.session.user._id;
        if (userId) { 
            let foundUser = await getUserById(userId);
            if (foundUser) { 
                let userpetId = foundUser.userPetId;
                let userPokemon = foundUser.userPokemons[userpetId - 1];
                let rankName = getRankName(foundUser);
                let filteredPokemons: Pokemon[] = foundUser.userPokemons;
                const action: string | undefined = req.query.action as string | undefined;
                if (action === "search") {
                    // Handle search action
                    const searchQuery: string | undefined = req.query.searchInput as string | undefined;
                    if (searchQuery) {
                        filteredPokemons = foundUser.userPokemons.filter(data =>
                            data.name.toLowerCase().includes(searchQuery.toLowerCase())
                        );
                        console.log(searchQuery);
                        console.log(filteredPokemons);
                    }
                } else if (action === "sort") {
                    // Handle sort action
                    filteredPokemons = await getUserPokemonsSortedByIsCatched(userId);
                }

                res.render("pokedex", {
                    user: foundUser,
                    pokemon: userPokemon,
                    rankName: rankName,
                    data: data,
                    fixedPokemon: fixedPokemon
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

app.get("/pokedex/:id", secureMiddleware, async (req, res) => {
    const pokemonId = parseInt(req.params.id);
    const pokemon = data.find(p => p.id === pokemonId);
    
    if (req.session.user && pokemon) {
        let userId = req.session.user._id;
        if (userId) {  // Check if userId is defined
            let foundUser = await getUserById(userId);
            if (foundUser) {  // Check if foundUser is not null
                let userpetId = foundUser.userPetId;
                let userPokemon = foundUser.userPokemons[userpetId - 1];
                let rankName = getRankName(foundUser);
                res.render("pokedexDetail", {
                    user: foundUser,
                    pokemon: userPokemon,
                    rankName: rankName,
                    data: data,
                    pokemonDetail: pokemon,
                    evolutions: pokemon.evolutions // Stuur de evoluties mee naar de view
                });
            } else {
                res.status(404).send("User not found");
            }
        } else {
            res.status(400).send("User ID is not defined");
        }
    } else {
        res.status(401).send("pokemon not found");
    }
});


app.post("/pokedex/:id", secureMiddleware, async (req, res) => {
    const pokemonId = parseInt(req.params.id);
    const pokemon = data.find(p => p.id === pokemonId);
    
    try {
        if (req.session.user && pokemon) {
            const userId = req.session.user._id;
            if (userId) {
                const foundUser = await getUserById(userId);
                if (foundUser) {
                    await updatePartnerPokemon(userId, pokemonId);
                    res.render("pokedexDetail", {
                        user: foundUser,
                        pokemon: foundUser.userPokemons[foundUser.userPetId - 1],
                        rankName: getRankName(foundUser),
                        data: data,
                        pokemonDetail: pokemon,
                        evolutions: pokemon.evolutions
                    });
                } else {
                    res.status(404).send("User not found");
                }
            } else {
                res.status(400).send("User ID is not defined");
            }
        } else {
            res.status(401).send("Pokemon not found");
        }
    } catch (error) {
        console.error("Error updating user's partner pokemon:", error);
        res.status(500).send("Internal Server Error");
    }
});



app.get("/compare/:id",secureMiddleware, async(req, res) => {
    const pokemonId = parseInt(req.params.id);
    const pokemon = data.find(p => p.id === pokemonId);
    if (req.session.user) {
        let userId = req.session.user._id;
        if (userId) {  // Check if userId is defined
            let foundUser = await getUserById(userId);
            if (foundUser) {  // Check if foundUser is not null
                let userpetId = foundUser.userPetId;
                let userPokemon = foundUser.userPokemons[userpetId - 1];
                let rankName = getRankName(foundUser);
                res.render("compare", {
                    user: foundUser,
                    pokemon: userPokemon,
                    rankName: rankName,
                    data: data,
                    pokemonCompare:pokemon
                });
            } else {
                res.status(404).send("User not found");
            }
        } else {
            res.status(400).send("User ID is not defined");
        }
    } else {
        res.status(401).send("Pokemon not found");
    }


});



app.get("/whosthatpokemon", async (req, res) => {
    /**Hier komt Who's that pokemon pagina */
    

  

  const [randomNumber] = getRandomUniqueNumbers(151, 1);
    const randomPokemon: Pokemon | undefined = data[randomNumber];

    if (req.session.user) {
        let userId = req.session.user._id;
        if (userId) { 
            let foundUser = await getUserById(userId);
            if (foundUser) {  
                let userpetId = foundUser.userPetId;
                let userPokemon = foundUser.userPokemons[userpetId - 1];
                let rankName = getRankName(foundUser);
                res.render("whosthatpokemon", {
                    randomSprite: randomPokemon.front_default,
                    user: foundUser,
                    pokemon: userPokemon,
                    rankName: rankName,
                    pokemonName: randomPokemon.name
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





app.get("/nextPokemon", async (req, res) => {
    const [randomNumber] = getRandomUniqueNumbers(151, 1);
    const randomPokemon: Pokemon | undefined = data[randomNumber];

    if (randomPokemon) {
        res.json({
            randomSprite: randomPokemon.front_default,
            pokemonName: randomPokemon.name,
        });
    } else {
        res.status(404).send("No Pokémon found");
    }
});
app.post("/updatePokemonHealth", async (req, res) => {
    const { pokemonName } = req.body;
    if (!pokemonName) {
        return res.status(400).json({ error: "Pokémon name is required" });
    }

    if (!req.session.user) {
        return res.status(401).json({ error: "User not logged in" });
    }

    const userId = req.session.user._id;

    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    } try {
        const userPokemon = await getPokemonFromUserr(new ObjectId(userId), pokemonName);
        if (!userPokemon) {
            return res.status(404).json({ error: "Pokémon not found" });
        }

        const initialHP = userPokemon.health;
        console.log(`Initial HP of ${pokemonName}: ${initialHP}`);

        const success = await updatePokemonHealthStreak(new ObjectId(userId), pokemonName);
        if (success) {
            const updatedUserPokemon = await getPokemonFromUserr(new ObjectId(userId), pokemonName);
            const updatedHP = updatedUserPokemon.health;
            console.log(`Updated HP of ${pokemonName}: ${updatedHP}`);

            res.json({ message: "Pokémon health updated successfully", initialHP, updatedHP });
        } else {
            res.status(500).json({ error: "Failed to update Pokémon health" });
        }
    } catch (error) {
        console.error("Error updating Pokémon health:", error);
        res.status(500).json({ error: "Internal server error" });
    }
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
                let rankName = getRankName(foundUser);
                res.render("howtoplay", { user: foundUser, pokemon: userPokemon, rankName: rankName });
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
   // await seed();
    await fetchAndInsertPokemons();
    

    data = await getPokemonCollection();
}
);