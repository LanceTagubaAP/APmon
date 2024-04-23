enum Rank {
    Beginner,
    Trainer,
    Expert,
    Kampioen,
    Legende
}
export interface Pokemon{
    id : number
    name : string
    type : string[]
    health : number
    attack : number
    defense : number
    description : string
    isCatched : boolean
    sprite : string
}
export interface User{
    id : number
    userName : string
    password : string
    userPokemons : Pokemon[]
    rank : Rank
    icon : string
    streak : number
}