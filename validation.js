import { getPanier } from "./model/panier.js";

/**
 * Valide un identifiant (ID) reçu par le serveur.
 * @param {*} id L'identifiant à valider.
 * @returns Une valeur booléenne indiquant si l'identifiant est valide ou non.
 */
export const validateId = (id) => {
    return !!id &&
        typeof id === 'number' &&
        Number.isInteger(id) &&
        id > 0;
}

/**
 * Valide le panier dans la base de données du serveur.
 * @returns Une valeur booléenne indiquant si le panier est valide ou non.
 */
export const validatePanier = async (idUtilisateur) => {
    let panier = await getPanier(idUtilisateur);
    return panier.length > 0;
}

/**
 * Valide l'adresse courriel fournie pour créer un nouveau compte.
 * @returns Une valeur booléenne indiquant si le courriel est valide et a le bon format.
 */
export const isCourrielValid = (courriel) =>
    typeof courriel === 'string' &&
	courriel.length >= 8 &&
    courriel.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/) 

/**
 * Valide le mot de passe fourni pour créer un nouveau compte.
 * @returns Une valeur booléenne indiquant si le mot de passe est valide (au moins 8 caractères).
 */
export const isMotPasseValid = (motPasse) => 
	typeof motPasse === 'string' &&
	motPasse.length >= 8
