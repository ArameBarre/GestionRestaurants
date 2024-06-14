import connectionPromise from '../connexion.js';
import bcrypt from 'bcrypt';

let hash = await bcrypt.hash('Test1234', 10);
let valide = await bcrypt.compare('Test1234', hash);

/**
 * Ajoute un nouvel utilisateur dans la table utilisateur 
 * @param {Courriel} courriel Identifiant unique, format courriel.
 * @param {String} mot_de_passe On passe cette valeur à bcrypt pour créer son hash.
 */
export async function addUtilisateur(courriel, mot_de_passe) {
	const connection = await connectionPromise;

    let hash = await bcrypt.hash(mot_de_passe, 10);

	await connection.run(
		`INSERT INTO utilisateur(courriel, mot_de_passe)
		VALUES(?, ?)`,
		[courriel, hash]
	);
}

/**
 * Rechercher et retourner un utilisateur par son id_utilisateur.
 * @param {String} idUtilisateur Identifiant unique qui est attribué automatiquement dès la création d'un nouvel utilisateur.
 * @returns Un utiisateur (un objet?) et tous ses attributs.
 * La fonction n'est jamais utilisée sur le serveur.
 */
export async function getUtilisateurParId(idUtilisateur){
	const connection = await connectionPromise;

	let utilisateur = await connection.get(
		`SELECT *
		FROM utilisateur
		WHERE id_utilisateur = ?`,
		[idUtilisateur]
	);

	return utilisateur;
}

/**
 * Rechercher et retourner un utilisateur par son courriel.
 * @param {Courriel} courriel Format courriel
 * @returns Un utiisateur (un objet?) et tous ses attributs.
 * La fonction n'est jamais utilisée sur le serveur.
 */
export async function getUtilisateurParCourriel(courriel){
	const connection = await connectionPromise;

	let utilisateur = await connection.get(
		`SELECT *
		FROM utilisateur
		WHERE courriel = ?`,
		[courriel]
	);

	return utilisateur;
}