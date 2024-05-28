import express from "express";
import { User } from "../interfaces";
import { login } from "../database";
import { secureMiddleware } from "../secureMiddleware";


export function loginRouter() {
    const router = express.Router();

    router.get("/login", async (req, res) => {
        res.render("login");
    });

    router.post("/login", async (req, res) => {
        const username: string = req.body.usernameInput;
        const password: string = req.body.passwordInput;
        try {
            let user: User = await login(username, password);
            delete user.password; // Remove password from user object. Sounds like a good idea.
            req.session.user = user;
            res.redirect("/mainpage")
        } catch (e: any) {
            res.redirect("/login");
        }
    });

    router.post("/logout", secureMiddleware, async (req, res) => {
        req.session.destroy((err) => {
            res.redirect("/login");
        });
    });

    return router;
}