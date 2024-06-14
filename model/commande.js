import connectionPromise from '../connexion.js';

/**
 * Retourne une liste de toutes les commandes ainsi que tous les produits 
 * qu'elles contiennent dans la base de données.
 * @returns Une liste de toutes les commandes ainsi que tous les produits qu'elles contiennent.
 */
export const getCommande = async () => {
    let connection = await connectionPromise;
    
    // Recherche des commandes et des produits à l'intérieur des commandes
    let results = await connection.all(
        `SELECT commande.id_commande, date, id_etat_commande,
            produit.id_produit, chemin_image, produit.nom, quantite
        FROM commande
        INNER JOIN commande_produit ON commande.id_commande = commande_produit.id_commande
        INNER JOIN produit ON commande_produit.id_produit = produit.id_produit
        WHERE id_etat_commande <> 1
        ORDER BY commande.id_commande;`
    );

    /* Construction d'une liste de commandes plus simple à utiliser en 
    Javascript. La liste aura le format suivant:
    [
        {
            id_commande: ?,
            date: ?,
            id_etat_commande: ?,
            produit: [
                {
                    id_produit: ?,
                    chemin_image: ?,
                    nom: ?,
                    quantite: ?,
                },
                ...
            ]
        },
        ...
    ]*/
    // Dernier identifiant sur lequel on a bouclé
    let lastId = -1;

    // Nouvelle liste de commandes
    let commandes = [];
    for (const row of results) {
        // Si c'est la première fois qu'on rencontre l'identifiant de la 
        // commande, on lui crée une entrée dans notre tableau de commandes.
        if (lastId != row.id_commande) {
            lastId = row.id_commande;
            commandes.push({
                id_commande: row.id_commande,
                date: (new Date(row.date)).toLocaleString('fr-ca'),
                id_etat_commande: row.id_etat_commande,
                produit: []
            });
        }

        // On ajoute les données des produits dans la commande.
        commandes[commandes.length - 1].produit.push({
            id_produit: row.id_produit,
            chemin_image: row.chemin_image,
            nom: row.nom,
            quantite: row.quantite
        });
    }

    return commandes;
}

/**
 * Retourne la derniere commande entree ainsi que tous ses produits pour envoyer un SSE 
 * pour que celle-ci soit affichée pour le client.
 * @param {Integer} lastCommandeID le id_commande de la commande la plus récente
 *      (utilise la fonction getDerniereCommandeId ci-dessous pour l'obtenir)
 * @returns La derniere commandes ainsi que tous les produits qu'elle contient structure de
 *      meme façon que la liste d'object dans getCommande().
 */
const getDerniereCommande = async (lastCommandeID) => {
    let connection = await connectionPromise;
    
    const rows = await connection.all(
        `SELECT commande.id_commande, date, id_etat_commande,
            produit.id_produit, chemin_image, produit.nom, quantite
        FROM commande
        INNER JOIN commande_produit ON commande.id_commande = commande_produit.id_commande
        INNER JOIN produit ON commande_produit.id_produit = produit.id_produit
        WHERE commande.id_commande = ?;`,
        [lastCommandeID]
        );
    
    // Donne la meme structure aux données que getCommande
    let derniereCommande = {
        id_commande: null,
        date: null,
        id_etat_commande: null,
        produit: []
    };

    if (rows && rows.length > 0) {
        const firstRow = rows[0];
        derniereCommande.id_commande = firstRow.id_commande;
        derniereCommande.date = (new Date(firstRow.date)).toLocaleString('fr-ca');
        derniereCommande.id_etat_commande = firstRow.id_etat_commande;

        // Boucle sur les lignes pour tous les produits dans une commande
        rows.forEach(row => {
            derniereCommande.produit.push({
                id_produit: row.id_produit,
                chemin_image: row.chemin_image,
                nom: row.nom,
                quantite: row.quantite
            });
        });
    }
    return derniereCommande;
};


/**
 * Retourne une liste de l'état de la derniere commande dans la base de données.
 * @param {Integer} idUtilisateur pour trouver la derniere commande (et son etat) de l'utilisateur
 * @returns L'état de la derniere commande.
 */
export const getEtatDerniereCommande = async (idUtilisateur) => {
    let connection = await connectionPromise;

    const etatDerniereCommande = await connection.get(
        `SELECT commande.id_commande, date, etat_commande.id_etat_commande, etat_commande.nom AS etat_nom,
        produit.id_produit, chemin_image, produit.nom, quantite
        FROM commande
        INNER JOIN commande_produit ON commande.id_commande = commande_produit.id_commande
        INNER JOIN produit ON commande_produit.id_produit = produit.id_produit
        INNER JOIN etat_commande ON commande.id_etat_commande = etat_commande.id_etat_commande
        WHERE id_utilisateur = ?
        ORDER BY date DESC
        LIMIT 1;`, 
        [idUtilisateur]);
    return etatDerniereCommande;
}

/**
 * Retourne l'identifiant de la derniere commande placée
 * @returns le id_commande de la commande la plus récente.
 */
const getDerniereCommandeId = async () => {
    let connection = await connectionPromise;
    const result = await connection.get(
        'SELECT id_commande FROM commande ORDER BY date DESC LIMIT 1;'
    );
    // Retourne le id_commande de la commande la plus récente.
    if (result) {
        const latestOrderId = result.id_commande;
        return latestOrderId;
    }
    // S'il jamais il n'y a pas de commandes.
    return null;
};


/**
 * Soumet le panier en modifiant l'etat d'une commande de 'panier' à 'cuisine'.
 * @param {Integer} idUtilisateur pour trouver le panier courrant et changer son etat
 * @returns derniereCommande => es données de la commande la plus récente pour afficher sur la page commandes
 */
export const soumettreCommande = async (idUtilisateur) => {
    let connection = await connectionPromise;

    // Modifie la commande de panier pour la soumettre.
    await connection.run(
        `UPDATE commande
        SET id_etat_commande = 2, date = ?
        WHERE id_etat_commande = 1 AND
        id_utilisateur = ?;`,
        [Date.now(), idUtilisateur]
    );
    
    // Retourne l'identifiant de la derniere commande et l'utilise pour retourner la derniere commande
    let lastCommandeID = await getDerniereCommandeId();
    const derniereCommande = await getDerniereCommande(lastCommandeID);
    
    return derniereCommande;
};

/**
 * Modifie l'état d'une commande dans la base de données.
 * @param {Integer} idCommande Identifiant de la commande à modifier.
 * @param {Integer} idEtat Nouvel identifiant de l'état de la commande.
 */
export const modifyEtatCommande = async (idCommande, idEtat) => {
    let connection = await connectionPromise;

    await connection.run(
        'UPDATE commande SET id_etat_commande = ? WHERE id_commande = ?',
        [idEtat, idCommande]
    )
}

/**
 * Retourne une liste de tous les états de commande dans la base de données.
 * @returns Une liste de tous les états de commande.
 */
export const getEtatCommande = async () => {
    let connection = await connectionPromise;

    let results = await connection.all(
        'SELECT * FROM etat_commande WHERE id_etat_commande <> 1'
    );

    return results;
}