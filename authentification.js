import bcrypt from 'bcrypt';
import passport from "passport";
import { Strategy } from "passport-local";
import { getUtilisateurParCourriel, getUtilisateurParId } from "./model/utilisateur.js"; 

// Configuration générale de la stratégie.
// On indique ici qu'on s'attend à ce que le client envoit un variable "courriel" et "motDePasse" au serveur pour l'authentification.
const config = {
    usernameField: 'courriel', //or identifiant
    passwordField: 'mot_de_passe' //or mot_passe
};

// Configuration de quoi faire avec l'identifiant et le mot de passe pour les valider
// The parameters must match the ones configured right above
passport.use(new Strategy(config, async (courriel, mot_de_passe, done) => {
    // S'il y a une erreur avec la base de données, on retourne l'erreur au serveur
    try {
        // On va chercher l'utilisateur dans la base de données avec son identifiant, le courriel ici
        const utilisateur = await getUtilisateurParCourriel(courriel); //this must match the funtion in your utilisateur.js file
        //FOr example, it might be getUtilisateurParIdentifiant(identifiant);

        // Si on ne trouve pas l'utilisateur, on retourne que l'authentification a échoué avec un message
        if (!utilisateur) {
            return done(null, false, { error: 'mauvais_utilisateur' });
        }

        // Si on a trouvé l'utilisateur, on compare son mot de passe dans la base de données
        // avec celui envoyé au serveur. On utilise une fonction de bcrypt pour le faire
        const valide = await bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe);

        // Si les mot de passe ne concorde pas, on retourne que l'authentification a échoué avec un message
        if (!valide) {
            return done(null, false, { error: 'mauvais_mot_passe' });
        }

        // Si les mot de passe concorde, on retourne l'information de l'utilisateur au serveur
        return done(null, utilisateur);
    }
    catch (error) {
        return done(error);
    }
}));

passport.serializeUser((utilisateur, done) => {
    // On mets uniquement le courriel dans la session
    done(null, utilisateur.courriel); 
});

passport.deserializeUser(async (courriel, done) => {
    // S'il y a une erreur de base de donnée, on retourne l'erreur au serveur
    try {
        // Puisqu'on a juste l'adresse courriel dans la session, on doit être capable d'aller
        // chercher l'utilisateur avec celle-ci dans la base de données.
        const utilisateur = await getUtilisateurParCourriel(courriel); 
        done(null, utilisateur);
    }
    catch (error) {
        done(error);
    }
})