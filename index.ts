import express from "express";
import { getFirst151Pokemon } from "./apicall";
import { Pokemon } from "./interfaces";
import dotenv from "dotenv";
import { connect, fetchAndInsertPokemons,seed } from "./database";

const app = express();
const port = process.env.PORT || 3000;

app.set("port", port);
app.use(express.static("public"));
app.set("view engine", "ejs");

let data : Pokemon[] = [];

app.get("/", (req, res) => {
    /**Hier komt eerste pagina */
    res.render("index");
});

app.get("/titleScreen",(req,res)=>{
    /**Hier komt titleScreen pagina */
    res.render("titleScreen");
});

app.get("/signup",(req,res)=>{
    /**Hier komt signup pagina */
    let sprites = [];
    for (let index = 0; index < 7; index++) {
        let sprite = data[index].front_default;
        index+=2;
        sprites.push(sprite);    
    }
    res.render("signup",{
        sprites : sprites
    });
});

app.get("/login",(req,res)=>{
    /**Hier komt login pagina */
    res.render("login");
});

app.get("/battle",(req,res)=>{
    /**Hier komt battle pagina */
    res.render("battle");
});


app.get("/mainpage",(req,res)=>{
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
    let randomNumber2: number = Math.floor(Math.random() * 151) + 1;
    let randomNumber3: number = Math.floor(Math.random() * 151) + 1;
    let randomPokemon : Pokemon = data[randomNumber];
    let randomPokemon2 : Pokemon = data[randomNumber2];
    let randomPokemon3 : Pokemon = data[randomNumber3];
    
    res.render("battlechoose",{
        randomName : randomPokemon.name,
        randomSprite : randomPokemon.front_default,
        randomHP : randomPokemon.health,
        randomAD : randomPokemon.attack,
        randomDF : randomPokemon.defense,
        randomName2 : randomPokemon2.name,
        randomSprite2 : randomPokemon2.sprite,
        randomHP2 : randomPokemon2.health,
        randomAD2 : randomPokemon2.attack,
        randomDF2 : randomPokemon2.defense,
        randomName3 : randomPokemon3.name,
        randomSprite3 : randomPokemon3.sprite,
        randomHP3 : randomPokemon3.health,
        randomAD3 : randomPokemon3.attack,
        randomDF3 : randomPokemon3.defense,
        data : data
    });

   
    
});

app.get("/pokedex", (req, res) => {
    const fixedPokemonId = 1; 
    const fixedPokemon = data.find(p => p.id === fixedPokemonId);

    res.render("pokedex",{data : data, fixedPokemon: fixedPokemon});
});

app.get("/pokedex/:id", (req, res) => {
    const pokemonId = parseInt(req.params.id);
    const pokemon = data.find(p => p.id === pokemonId);
    if (pokemon) {
        res.render("pokedexDetail", { pokemon: pokemon,
            data : data
         });
    } else {
        res.status(404).send("Pokemon not found");
    }
});


app.get("/compare/:id", (req, res) => {
    const pokemonId = parseInt(req.params.id);
    const pokemon = data.find(p => p.id === pokemonId);
    if (pokemon) {
        res.render("compare", { pokemon: pokemon,
            data : data
         });
    } else {
        res.status(404).send("Pokemon not found");
    }
});



app.get("/whosthatpokemon", (req, res) => {
    /**Hier komt Who's that pokemon pagina */

    let randomNumber: number = Math.floor(Math.random() * 151) + 1;
    let randomPokemon : Pokemon = data[randomNumber];
    
    
    res.render("whosthatpokemon",{
        randomSprite : randomPokemon.front_default

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
    await connect();
    await seed();
    await fetchAndInsertPokemons();

    data = await getFirst151Pokemon();

    }
);