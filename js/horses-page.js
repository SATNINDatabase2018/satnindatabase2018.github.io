let horses = [];


async function loadHorses() {

    const response =
        await fetch("data/horses.json");

    horses =
        await response.json();

    renderHorses();
}


function renderHorses() {

    const grid =
        document.getElementById(
            "database-grid"
        );

    const search =
        document.getElementById(
            "search"
        ).value.toLowerCase();

    const filtered =
        horses.filter(
            horse =>

                `${horse.breed} ${horse.coat || ""}`
                .toLowerCase()
                .includes(search)
        );

    grid.innerHTML = "";

    filtered.forEach(
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
                    alt="${horse.breed}"
                >

                <h3>
                    ${horse.breed}
                </h3>

                <p>
                    ${horse.coat || ""}
                </p>

                <p>
                    Generation:
                    ${horse.generation || "—"}
                </p>

                <p>
                    SC:
                    ${horse.sc ?? "—"}
                </p>

                <p>
                    ${horse.location || ""}
                </p>

                <a
                    class="button"
                    href="stable.html"
                >
                    Add to My Stable
                </a>
            `;

            grid.appendChild(card);
        }
    );
}


document
    .getElementById("search")
    .addEventListener(
        "input",
        renderHorses
    );


loadHorses();
