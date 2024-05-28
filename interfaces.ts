import { ObjectId } from "mongodb"

export enum Rank {
    Beginner,
    Trainer,
    Expert,
    Kampioen,
    Legende
}
export interface Pokemon{
    id : number
    name : string
    types : string[]
    health : number
    maxHealth : number
    attack : number
    defense : number
    description : string
    isCatched : boolean
    front_default : string
    back_default : string
    icon : string

}
export interface User{
    _id?: ObjectId;
    userName : string
    email: string
    password? : string
    userPetId : number
    userPokemons : Pokemon[]
    rank : Rank
    icon : string
    streak : number
}