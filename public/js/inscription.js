const formAuth = document.getElementById('form-auth');
const inputIdentifiant = document.getElementById('input-identifiant');
const inputMotPasse = document.getElementById('input-mot-passe');
const formErreur = document.getElementById('form-erreur');

/**
 * Envoie les informations nécessaires (courriel et mot de passe) pour créer un nouveau compte utilisateur 
 * @param {*} event Objet d'information sur l'événement (dans ce cas, l'événement sera un "submit")
 */
async function inscription(event) {
	event.preventDefault();

	let data = {
		courriel: inputIdentifiant.value,
		mot_de_passe: inputMotPasse.value
	};

	let response = await fetch('/api/inscription', {
		method: 'POST', 
		headers:{ 
			'Content-Type': 'application/json' 
		},
		body: JSON.stringify(data)
	});

	if (response.ok){
		location.replace('/connexion');
	} else if (response.status === 409){
		formErreur.innerText = 'L\'identifiant existe deja';
	} else if(response.status === 400){
		if (!isCourrielValid(inputIdentifiant.value))
			formErreur.innerText = 'Courriel invalide. Ex: exemple@test.com';
		else if (!isMotPasseValid(inputMotPasse.value))
			formErreur.innerText = 'Le mot de passe doit contenir au moins 8 caractères';
	} else
		formErreur.innerText = 'Données invalides';
}

/**
 * Valide l'adresse courriel fournie pour créer un nouveau compte. 
 * Dans ce cas, la fonction valide la valeur de l'input afin d'afficher un message d'erreur spécifique 
 * pour les courriels invalides.
 * @returns Une valeur booléenne indiquant si le courriel est valide et a le bon format.
 */
export const isCourrielValid = (courriel) =>
    typeof courriel === 'string' &&
	courriel.length >= 8 &&
    courriel.match(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/) 

/**
 * Valide le mot de passe fourni pour créer un nouveau compte.
 * Dans ce cas, la fonction valide la valeur de l'input afin d'afficher un message d'erreur spécifique 
 * pour les mots de passe invalides..
 * @returns Une valeur booléenne indiquant si le mot de passe est valide (au moins 8 caractères).
 */
export const isMotPasseValid = (motPasse) => 
	typeof motPasse === 'string' &&
	motPasse.length >= 8

// Ajoute l'exécution de la fonction "inscription()" à l'événement "submit".
formAuth.addEventListener('submit', inscription);