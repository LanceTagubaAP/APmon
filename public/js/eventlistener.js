document.addEventListener("DOMContentLoaded", () => {
    const attackButton = document.querySelector(".attack");

    attackButton.addEventListener("click", async () => {
        console.log("button attack clicked")
        // try {
        //     // Make a POST request to the backend route to handle attacks
        //     const response = await fetch("/battle", {
        //         method: "POST",
        //         headers: {
        //             "Content-Type": "application/json"
        //         },
        //         body: JSON.stringify({
        //             attacker: { /* Information about the user's Pokémon */ },
        //             defender: { /* Information about the enemy Pokémon */ }
        //         })
        //     });

        //     // Check if the request was successful
        //     if (response.ok) {
        //         // Parse the response JSON
        //         const updatedHP = await response.json();

        //         // Update HP values on the page
        //         document.getElementById("userHP").textContent = `User Pokémon HP: ${updatedHP.userHP}`;
        //         document.getElementById("enemyHP").textContent = `Enemy Pokémon HP: ${updatedHP.enemyHP}`;
        //     } else {
        //         console.error("Attack failed:", response.statusText);
        //     }
        // } catch (error) {
        //     console.error("Error attacking:", error);
        // }
    });
});
