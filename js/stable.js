let horseDatabase = [];


async function initialiseStable() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href =
            "login.html";
        return;
    }

    const response =
        await fetch(
            "data/horses.json"
        );

    horseDatabase =
        await response.json();

    loadStable();
}


async function loadStable() {

    const {
        data: horses,
        error
    } =
        await supabaseClient
        .from("user_horses")
        .select("*");

    if (error) {
        console.error(error);
        return;
    }

    const grid =
        document.getElementById(
            "stable-grid"
        );

    grid.innerHTML = "";

    horses.forEach(
        userHorse => {

            const horse =
                horseDatabase.find(
                    h =>
                        h.id ===
                        userHorse.horse_id
                );

            if (!horse) {
                return;
            }

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "item-card";

            card.innerHTML = `

                <img
                    src="${horse.image || ""}"
                >

                <h3>
                    ${userHorse.name ||
                    horse.breed}
                </h3>

                <p>
                    ${horse.breed}
                </p>

                <p>
                    ${horse.coat || ""}
                </p>

                <p>
                    ${userHorse.nickname || ""}
                </p>
            `;

            grid.appendChild(card);
        }
    );
}


const addHorseButton =
    document.getElementById(
        "add-horse-button"
    );

const horsePicker =
    document.getElementById(
        "horse-picker"
    );


addHorseButton.addEventListener(
    "click",
    () => {

        horsePicker.hidden =
            !horsePicker.hidden;

        renderHorseOptions();
    }
);


function renderHorseOptions() {

    const container =
        document.getElementById(
            "horse-options"
        );

    container.innerHTML = "";

    horseDatabase.forEach(
        horse => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "item-card";

            card.innerHTML = `

                <img
                    src="${horse.image || ""}"
                >

                <h3>
                    ${horse.breed}
                </h3>

                <p>
                    ${horse.coat || ""}
                </p>

                <button
                    onclick="addHorse(${horse.id})"
                >
                    Add to Stable
                </button>
            `;

            container.appendChild(card);
        }
    );
}


async function addHorse(horseId) {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    const name =
        prompt(
            "What is your horse's name?"
        );

    if (!name) {
        return;
    }

    const nickname =
        prompt(
            "Nickname? Optional."
        );

    const { error } =
        await supabaseClient
        .from("user_horses")
        .insert({
            user_id: user.id,
            horse_id: horseId,
            name: name,
            nickname:
                nickname || null
        });

    if (error) {
        console.error(error);
        alert("Could not add horse.");
        return;
    }

    horsePicker.hidden = true;

    loadStable();
}


initialiseStable();
