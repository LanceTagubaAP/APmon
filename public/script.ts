const dropdown = document.getElementById('dropdown') as HTMLSelectElement;
const image = document.getElementById('image') as HTMLImageElement;
const playButtonLink = document.getElementById('playButtonLink') as HTMLAnchorElement;
const playButton = document.getElementById('playButton') as HTMLButtonElement;

dropdown.addEventListener('change', function() {
    const selectedValue = dropdown.value;
    switch (selectedValue) {
        case '1':
            image.src = "../assets/imgs/APmon-game.jpg";
            playButtonLink.href = "./titleScreen"; // Zet de link terug naar de oorspronkelijke waarde
            playButton.disabled = false; // Schakel de knop in
            break;
        case '2':
            image.src = "../assets/img/FIFA.jpg";
            playButtonLink.removeAttribute('href'); // Verwijder de href-attribuut om de knop te deactiveren
            playButton.disabled = true; // Schakel de knop uit
            break;
        case '3':
            image.src = "../assets/img/FORTNITE.jpg";
            playButtonLink.removeAttribute('href'); // Verwijder de href-attribuut om de knop te deactiveren
            playButton.disabled = true; // Schakel de knop uit
            break;
        case '4':
            image.src = "../assets/img/LEGO.jpg";
            playButtonLink.removeAttribute('href'); // Verwijder de href-attribuut om de knop te deactiveren
            playButton.disabled = true; // Schakel de knop uit
            break;
        case '5':
            image.src = "../assets/img/LOTR.jpg";
            playButtonLink.removeAttribute('href'); // Verwijder de href-attribuut om de knop te deactiveren
            playButton.disabled = true; // Schakel de knop uit
            break;
        case '6':
            image.src = "../assets/img/MTG.jpg";
            playButtonLink.removeAttribute('href'); // Verwijder de href-attribuut om de knop te deactiveren
            playButton.disabled = true; // Schakel de knop uit
            break;
        default:
            image.src = '';
            playButtonLink.removeAttribute('href'); // Verwijder de href-attribuut om de knop te deactiveren
            playButton.disabled = true; // Schakel de knop uit
            break;
    }
});
