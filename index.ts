import express from "express";

const app = express();

app.set("port", 3000);
app.use(express.static("public"));


app.get("/",(req,res)=>{
    /**Hier komt eerste pagina */
});

app.get("/mainpage",(req,res)=>{
    /**Hier komt menu pagina */
});
app.get("/fightchoose",(req,res)=>{
    /**Hier komt pokemon vechten pagina */
});

app.get("/pokedex",(req,res)=>{
    /**Hier komt pokedex pagina */
});

app.get("/whosthatpokemon",(req,res)=>{
    /**Hier komt Who's that pokemon pagina */
});

app.get("/howtoplay",(req,res)=>{
    /**Hier komt how to play pagina */
});

app.listen(app.get("port"), () =>
    console.log("[server] http://localhost:" + app.get("port"))
  );