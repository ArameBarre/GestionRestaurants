// Aller chercher les configurations de l'application
import 'dotenv/config';

// Importer les fichiers et librairies
import express, { json, urlencoded } from 'express';
import { engine } from 'express-handlebars';
import session from 'express-session';
import memorystore from 'memorystore';
import passport from 'passport';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cspOption from './csp-options.js'
import { getProduit } from './model/produit.js';
import { getPanier, addToPanier, removeFromPanier, emptyPanier } from './model/panier.js';
import { getCommande, soumettreCommande, modifyEtatCommande, getEtatCommande, getEtatDerniereCommande } from './model/commande.js';
import { validateId, validatePanier, isCourrielValid, isMotPasseValid } from './validation.js';
import { addUtilisateur } from './model/utilisateur.js';
import './authentification.js';
import middlewareSse from './middleware-sse.js';
import https from 'node:https'
import { readFile } from 'fs/promises';

// Création du serveur
const app = express();

//Creation de la base de données da la session
const MemoryStore = memorystore(session);

// Configuration de l'engin de rendu
app.engine('handlebars', engine({
    helpers: {
        equals: (valeur1, valeur2) => valeur1 === valeur2
    }
}))
app.set('view engine', 'handlebars');
app.set('views', './views');

// Ajout de middlewares
app.use(helmet(cspOption));
app.use(compression());
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(session({
    cookie: { maxAge: 3600000 },
    name: process.env.npm_package_name, 
    store: new MemoryStore({ checkPeriod: 3600000 }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET 
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(middlewareSse());

// Routes
// Route pour ouvrir le stream pour envoyer les SSE
app.get('/api/stream', (request, response) => {
    if(!request.user){
		return response.status(401).end();
	}
	response.initStream();
});

// Route de la page du menu
app.get('/', async (request, response) => {
    response.render('menu', {
        title: 'Menu',
        produit: await getProduit(),
        user: request.user,
        admin: request.user && request.user.id_type_utilisateur === 2
    });
});

// Route de la page du panier
app.get('/panier', async (request, response) => {
    if(!request.user){
		return response.status(401).end();
    }
    let panier = await getPanier(request.user.id_utilisateur);
    response.render('panier', {
        title: 'Panier',
        produit: panier,
        estVide: panier.length <= 0,
        user: request.user,
        admin: request.user && request.user.id_type_utilisateur === 2
    });
});

// Route pour ajouter un élément au panier
app.post('/panier', async (request, response) => {
    if(!request.user){
		return response.status(401).end();
    }
    if (validateId(request.body.idProduit)) {
        addToPanier(request.user.id_utilisateur, request.body.idProduit, 1);
        response.sendStatus(201);
    }
    else {
        response.sendStatus(400);
    }
});

// Route pour supprimer un élément du panier
app.patch('/panier', async (request, response) => {
    if(!request.user){
		return response.status(401).end();
	}

    if (validateId(request.body.idProduit)) {
        removeFromPanier(request.user.id_utilisateur, request.body.idProduit);
        response.sendStatus(200);
    }
    else {
        response.sendStatus(400);
    }
});

// Route pour vider le panier
app.delete('/panier', async (request, response) => {
    if(!request.user){
		return response.status(401).end();
	}
    emptyPanier(request.user.id_utilisateur);
    response.sendStatus(200);
});

// Route de la page des commandes
app.get('/commande', async (request, response) => {
    if(!request.user){
		return response.status(401).end();
	}
	if(request.user.id_type_utilisateur !== 2){
		return response.status(403).end();
	}
    response.render('commande', {
        title: 'Commandes',
        commande: await getCommande(),
        etatCommande: await getEtatCommande(),
        user: request.user,
        admin: request.user && request.user.id_type_utilisateur === 2
    });
});

// Route pour soumettre le panier
app.post('/commande', async (request, response) => {
    if(!request.user){
		return response.status(401).end();
	}
    if (await validatePanier(request.user.id_utilisateur)) {
        let derniereCommande = await soumettreCommande(request.user.id_utilisateur); // added let derniereCommande = await 
        //new
        let etatDerniereCommande = await getEtatDerniereCommande(request.user.id_utilisateur);
        response.pushJson({
            idUtilisateur: request.user.id_utilisateur,
            derniereCommande: derniereCommande,
            etatDerniereCommande: etatDerniereCommande
        }, 'new-commande');
        //
        response.sendStatus(201);
    }
    else {
        response.sendStatus(400);
    }
});

// Route pour modifier l'état d'une commande
app.patch('/commande', async (request, response) => {
    if(!request.user){
		return response.status(401).end();
	}
	if(request.user.id_type_utilisateur !== 2){
		return response.status(403).end();
	}
    if (validateId(request.body.idCommande) &&
        validateId(request.body.idEtatCommande)) {
        modifyEtatCommande(
            request.body.idCommande,
            request.body.idEtatCommande
        );
        response.pushJson({
            idCommande: request.body.idCommande,
            idEtatCommande: request.body.idEtatCommande
        }, 'modify-etat-commande');
        response.sendStatus(200);
    }
    else {
        response.sendStatus(400);
    }
});

// Route pour créer un nouveau compte
app.post('/api/inscription', async (request, response, next) =>{
	if (isCourrielValid(request.body.courriel) && 
		isMotPasseValid(request.body.mot_de_passe)){
		try {	
			await addUtilisateur(
				request.body.courriel,
				request.body.mot_de_passe
			);
			response.status(201).end();
		}
		catch(error) {
			if (error.code === 'SQLITE_CONSTRAINT'){ 
				response.status(409).end();
			} else {
				next(error); 
			}
		}
	} else {
		response.status(400).end();
	}
})

// Route pour se connecter/ourvrir la session
app.post('/api/connexion', (request, response, next) => {
    // On vérifie le le courriel et le mot de passe envoyé sont valides
    if (isCourrielValid(request.body.courriel) &&
        isMotPasseValid(request.body.mot_de_passe)) {
        // On lance l'authentification avec passport.js
        passport.authenticate('local', (error, user, info) => { 
            if (error) { // S'il y a une erreur, on la passe au serveur
                next(error);
            }
            else if (!user) { //Si la connexion échoue, on envoit l'information au client avec un code  401 (Unauthorized)
                response.status(401).json(info);
            }
            else { //Si tout fonctionne, on ajoute l'utilisateur dans la session et on retourne un code 200 (OK)
                request.logIn(user, (error) => { 
                    if (error) {
                        next(error);
                    }
                    response.sendStatus(200); 
                });
            }
        })(request, response, next);
    }
    else {
        response.sendStatus(400);
    }
});

// Route pour se déconnecter/fermer la session
app.post('/api/deconnexion', (request, response, next) => {
    // Déconnecter l'utilisateur
    request.logOut((erreur) => {
	    if (erreur){
		    next(erreur);
	    }
	    // Rediriger l'utilisateur vers une autre page
	    response.redirect('/');
    });
});

// Route pour la page d'inscription
app.get('/inscription', (request, response) =>{
	response.render('authentification', {
		titre: 'Inscription',
		styles: ['/css/style,css'],
		scripts: ['/js/inscription.js'],
		bouton: "S'inscrire",
        admin: request.user && request.user.id_type_utilisateur === 2
	});
});

// Route pour la page de connexion
app.get('/connexion', (request, response) =>{
	response.render('authentification', {
		titre: 'Connexion',
		styles: ['/css/style,css'],
		scripts: ['/js/connexion.js'],
		bouton: 'Connecter',
        user: request.user,
        admin: request.user && request.user.id_type_utilisateur === 2
	});
});

// Renvoyer une erreur 404 pour les routes non définies
app.use(function (request, response) {
    // Renvoyer simplement une chaîne de caractère indiquant que la page n'existe pas
    response.status(404).send(request.originalUrl + ' not found.');
});

// Démarrage du serveur
if (process.env.NODE_ENV === 'development'){
	let credentials = {
		key: await readFile('./security/localhost.key'),
		cert: await readFile('./security/localhost.cert')
	}
	
	https.createServer(credentials, app).listen(process.env.PORT);
	console.log(`Serveur demarre: https://localhost:${process.env.PORT}`);
} 
else {
	app.listen(process.env.PORT);
	console.log(`Serveur demarre: http://localhost:${process.env.PORT}`)
}
