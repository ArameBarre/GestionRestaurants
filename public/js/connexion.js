const formAuth = document.getElementById('form-auth');
const inputIdentifiant = document.getElementById('input-identifiant');
const inputMotPasse = document.getElementById('input-mot-passe');
const formErreur = document.getElementById('form-erreur')

/**
 * Envoie les informations nécessaires (courriel et mot de passe) pour connecter à un compte utilisateur existant
 * @param {*} event Objet d'information sur l'événement (dans ce cas, l'événement sera un "submit")
 */
async function connexion(event) {
	event.preventDefault();

	let data = {
		courriel: inputIdentifiant.value,
		mot_de_passe: inputMotPasse.value
	};

	let response = await fetch('/api/connexion', {
		method: 'POST', 
		headers:{ 'Content-Type': 'application/json' },
		body: JSON.stringify(data)
	});
	
	if (response.ok){
		location.replace('/');
	} 
	else if (response.status === 401){

		let info = await response.json();

		if (info.error === 'mauvais_utilisateur'){
			formErreur.innerText = 'Identifiant inexistant.';
		}
		else if (info.error === "mauvais_mot_passe")
			formErreur.innerText = 'Mauvais mot de passe.';
	}	
	else {
		// Toutes les autres erreurs
		formErreur.innerText = `Données invalides.`;
	}
}

// Ajoute l'exécution de la fonction "connexion()" à l'événement "submit".
formAuth.addEventListener('submit', connexion);