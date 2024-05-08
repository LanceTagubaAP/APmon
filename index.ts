import express from "express";
import { getFirst151Pokemon } from "./apicall";
import { Pokemon } from "./interfaces";

const app = express();

app.set("port", 3000);
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
        let sprite = data[index].sprite;
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

app.get("/compare",(req,res)=>{
    /**Hier komt compare pagina */
    res.render("compare");
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
    let randomPokemon : Pokemon = data[randomNumber];
    
    res.render("battlechoose",{
        randomName : randomPokemon.name,
        randomSprite : randomPokemon.sprite,
        randomHP : randomPokemon.health,
        randomAD : randomPokemon.attack,
        randomDF : randomPokemon.defense
    });

   
    
});

app.get("/pokedex", (req, res) => {
    /**Hier komt pokedex pagina */
    res.render("pokedex");
});

app.get("/whosthatpokemon", (req, res) => {
    /**Hier komt Who's that pokemon pagina */

    let randomNumber: number = Math.floor(Math.random() * 151) + 1;
    let randomPokemon : Pokemon = data[randomNumber];
    
    
    res.render("whosthatpokemon",{
        randomSprite : randomPokemon.sprite

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